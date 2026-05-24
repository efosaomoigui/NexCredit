# vision.md — NexCredit
## Created by Scriptwall Compass on 2026-05-22

## Current Status Summary
NexCredit is blocked in Sprint 2 by acceptance persistence failures and state-truth drift, but recovery is clear: enforce backend-authoritative, idempotent flow continuity.

## Key Findings (Compass Audit)
- First-loan offer acceptance is the critical failure point; persistence is unreliable under network instability.
- Onboarding and stage progression can diverge between mobile local state and backend truth.
- Fallback contract strategy exists and should be preserved, but needs stricter gating and observability.
- Third-party provider integrations and final selections remain unresolved, requiring continuity-first adapter patterns.
- No automated tests were detected, increasing risk of repeated regressions in critical borrower paths.

## Immediate Actions Required
1. Trace and fix acceptance write path with idempotency and atomic persistence guarantees.
2. Make mobile success transition conditional on backend persistence confirmation.
3. Align stage rendering with backend workflow states and repair resume logic.
4. Add minimal critical-path tests for acceptance, stage progression, and fallback envelopes.
5. Confirm admin visibility for all persisted onboarding/acceptance records.
