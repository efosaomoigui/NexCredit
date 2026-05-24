You are resuming NexCredit on 2026-05-22. Source of truth is repository files and 00_BRAIN docs, not chat memory.

Mission:
Recover Sprint 2 execution by delivering a robust first-loan acceptance and onboarding continuity path for Nigerian borrowers, with backend persistence guarantees and admin visibility.

Current truth:
- Status: BLOCKED
- Active sprint: Sprint 2 — Identity, Fraud Controls & Bank Matching Integration
- Confidence: STUCK
- Primary break: first loan-offer acceptance fails under unstable network and backend submission may not be created
- Secondary break: stage calculation/display/progression drift between mobile and backend
- Structural risk: no automated tests detected

Non-negotiables:
1) Do not invent business logic.
2) Do not work outside Sprint 2 scope.
3) Do not refactor currently working code unless explicitly required for Sprint 2 fix.
4) Flag any conflict between code and docs.
5) Preserve loan-intent-first, Nigeria-only, OTP/BVN/face/bank-match requirements.
6) Keep fallback responses contract-valid and truthful when providers are unavailable.

Execution order:
1) Read AGENTS.md, 00_BRAIN/PROJECT_STATE.md, 00_BRAIN/DECISIONS.md, 00_BRAIN/WORKFLOW_RULES.md, 02_ARCHITECTURE/architecture.md, and Sprint 2 requirements.
2) Trace first-offer acceptance end-to-end: mobile trigger, API endpoint, service layer, DB write, admin visibility path.
3) Implement idempotent acceptance semantics and atomic persistence; return explicit retryable error envelopes on failure.
4) Update mobile acceptance handling to depend on backend-confirmed persistence before success UI transition.
5) Reconcile stage calculation/rendering to backend-authoritative checkpoint states.
6) Fix resume/re-entry drift for new and returning users (including unpaid-loan guard).
7) Keep provider-unavailable fallback mode active but environment-gated, observable, and non-deceptive.
8) Add minimal critical-path tests for acceptance persistence, stage alignment, and fallback contract envelopes.

Definition of done:
- No dead-end onboarding branches for new/returning users.
- Offer acceptance reliably persists, or fails with explicit retry path.
- Admin can see and act on submitted onboarding/loan records.
- Stage display equals backend workflow truth after app restart/resume.
- Fallback mode remains contract-valid and clearly signaled.

Known unresolved decisions (do not force final choice in this sprint):
- Face verification provider final selection.
- Bank verification provider path finalization.
- Payment/disbursement rail finalization.
- Final permission scope and full eligibility/risk rule finalization.

If blocked by provider readiness:
Use adapter abstraction + deterministic fallback contracts and continue flow hardening without architecture drift.