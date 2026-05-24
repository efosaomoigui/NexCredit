# Lending Third-Party Dependency Audit

Date: 2026-05-24
Scope: `services/lending_engine/`, related fallback models, migrations/seeds.

## 1) Inventory: Third-Party-Dependent Lending Endpoints

1. `GET /loans/eligibility`
- Dependency type: Credit bureau decision signals (indirect).
- Current simulation path: `PricingPolicyService.evaluate_for_user` now reads `KycRecord.bvn_hash` and resolves `SimCreditProfile` from internal DB table `sim_credit_profiles`.
- Contract surface: Existing response shape unchanged (`max_limit`, `selected_product`, `pricing_reason_codes`, etc.).

2. `POST /loans/apply`
- Dependency type: Identity/KYC verification (indirect).
- Current simulation path: Reads `KycRecord` flags (`bvn_verified`, `selfie_score`) that are populated by identity fallback flows backed by internal tables (`test_bvn_identities`, `sim_bank_accounts`, fallback verification logs).
- Contract surface: Existing apply response/error envelope unchanged.

3. `GET /admin/loans/pricing-preview/{user_id}`
- Dependency type: Same as eligibility (credit signals).
- Current simulation path: Reuses `PricingPolicyService.evaluate_for_user`, therefore now DB-backed via `sim_credit_profiles`.
- Contract surface: Existing policy preview response shape unchanged.

## 2) Gaps Found (Before This Change)

1. Lending pricing used placeholder hardcoded measured scores (`credit_score=0`) rather than simulation tables.
2. This left lending fallback incomplete for bureau-like behavior despite presence of simulation schema and seed data.
3. Result: score-gated policy behavior could not be realistically validated end-to-end from lending APIs.

## 3) Implemented Fixes

1. `services/lending_engine/app/services/pricing_policy.py`
- Added DB-backed simulated credit loader:
  - Lookup `KycRecord` by user.
  - Use BVN from `bvn_hash` (decrypted by model type).
  - Resolve `SimCreditProfile` where `is_current=True`.
- Replaced placeholder measured credit score with simulated score when available.
- Kept response contract stable; added reason code `SIMULATED_CREDIT_PROFILE_USED`.
- Applied simulated `recommended_limit` as a cap over computed effective limit.
- Added safe fallback for partial test objects without `bvn_hash`.

2. `infra/migrations/seed.py`
- Expanded fallback simulation datasets:
  - More `test_bvn_identities` personas.
  - More `sim_credit_profiles` across approve/manual/decline distributions.
  - More `sim_bank_accounts` plus:
    - explicit mismatch fixture (`Unknown Person`) for negative name-match tests,
    - unlinked account fixture (`bvn=None`) for lookup-only scenarios.

## 4) Seed Data Expansion Plan (Now Implemented)

1. Coverage dimensions added:
- Risk gradients: low/medium/high.
- Decision hint gradients: `approve`, `manual_review`, `decline`.
- Credit limit spread: low to high recommendations.
- Bank verification variants: matched identity, mismatched identity, no-BVN account.

2. Idempotency:
- Existing upsert-style checks preserved (`select ... if not exists`) to keep reruns safe.

## 5) Provider Compatibility Checklist

1. API contracts unchanged at lending endpoint boundaries.
2. Fallback-source change is internal (service-layer data source), not schema-level.
3. `pricing_reason_codes` remains extensible list; adding `SIMULATED_CREDIT_PROFILE_USED` does not break consumers expecting array semantics.
4. Transition to production bureau providers can swap score source while preserving:
- `measured_scores` keys,
- selected product shape,
- effective limit/rate fields,
- error/success envelope format.
5. Existing acceptance reliability/idempotency envelope remains intact (`ACCEPTANCE_PERSISTENCE_RETRYABLE`).

## 6) Test Evidence (Simulated Flow)

Executed:

`pytest -q services/lending_engine/tests/test_acceptance_flow.py services/lending_engine/tests/test_pricing_policy_simulation.py`

Result:
- `10 passed`, `1 warning` (pydantic deprecation warning, unrelated to fallback behavior).

New/updated simulation-focused assertions:
1. `test_evaluate_for_user_uses_simulated_credit_profile_limit_and_scores`
- Verifies measured score derives from `sim_credit_profiles`.
- Verifies effective limit is capped by simulated recommendation.

2. `test_evaluate_for_user_respects_score_gate_with_simulated_credit`
- Verifies policy score gate behavior using simulated credit profile.

3. `test_loan_eligibility_endpoint_uses_simulated_credit_profile_contract`
- Verifies endpoint contract remains valid while simulated credit profile drives output (`max_limit`, reason codes).

