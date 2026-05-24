# DECISIONS.md — NexCredit
## Inferred by Scriptwall Compass on 2026-05-22

## [DEC-001] Loan Intent Before Registration
**Date:** 2026-05-17
**Decision:** Start onboarding with loan intent (amount/duration) before deep profile registration.
**Reason:** Mobile borrowers expect immediate progress toward access to funds.
**Impact:** Requires progressive data capture and route guarding but improves conversion and perceived speed.

---

## [DEC-002] Mobile Must Not Fail When Upstream APIs Are Missing
**Date:** 2026-05-17
**Decision:** Backend endpoints must return deterministic, schema-valid fallback responses when third-party providers are unavailable.
**Reason:** Continuity-first execution is required to avoid blocking end-to-end UX.
**Impact:** Demands strict mock/fallback contract management and explicit retirement plan.

---

## [DEC-003] Risk-First Semi-Automated Lending
**Date:** 2026-05-17
**Decision:** Keep human review gates for approvals and disbursements in Phase 1; AI outputs remain advisory.
**Reason:** Fraud and capital protection take priority over full automation speed.
**Impact:** Admin/reviewer transitions, auditability, and escalation states are mandatory.

---

## [DEC-004] Nigeria-Only Compliance Constraint
**Date:** 2026-05-17
**Decision:** Enforce Nigeria-only operations with BVN/KYC rigor and local rails assumptions.
**Reason:** Regulatory fit and operational viability are market-specific.
**Impact:** Location gating, identity verification, and local financial integrations remain critical path.

---

## [DEC-005] Persistence Before Loan Acceptance Success
**Date:** 2026-05-18
**Decision:** Loan-offer acceptance is successful only after backend persistence confirmation; failures must be explicit and retryable.
**Reason:** Silent submission failure creates user trust and operational gaps.
**Impact:** Requires idempotent acceptance endpoint and robust mobile retry/error handling.

---

## [DEC-006] Interim Contract for Missing Third-Party APIs
**Date:** 2026-05-18
**Decision:** Maintain temporary backend tables/contracts for BVN and credit-score fields until final providers are integrated.
**Reason:** Frontend progression must continue despite incomplete external integrations.
**Impact:** Introduces cleanup debt and requires compatibility mapping to final provider payloads.

---

## [DEC-007] Loan Stage Logic Is User-Critical
**Date:** 2026-05-18
**Decision:** Prioritize correcting stage calculation and display/progression logic as onboarding completion criteria.
**Reason:** Stage mismatches create navigation confusion and completion drop-off.
**Impact:** Backend state machine and frontend rendering must be strictly aligned.

