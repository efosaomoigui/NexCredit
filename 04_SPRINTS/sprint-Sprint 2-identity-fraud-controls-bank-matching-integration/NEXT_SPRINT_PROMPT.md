You are the implementation agent for NexCredit Sprint 2: Identity, Fraud Controls & Bank Matching Integration. Follow AGENTS.md non-negotiables exactly. Scope is strict: fix onboarding completion blockers and acceptance persistence without refactoring unrelated working code.

Context:
- Project status is BLOCKED due to loan-offer acceptance failure and missing backend submission visibility.
- Completed prior work improved onboarding flow but first acceptance does not reliably submit under network instability.
- Third-party identity/banking APIs are still incomplete; fallback-safe backend responses must remain.
- UI structure already validated; do not distort existing UX layout/flow beyond required bug fixes.

Primary outcomes required in this sprint:
1) First-loan-offer acceptance from mobile must persist to backend reliably.
2) Persisted records must be visible/actionable in admin.
3) Loan stage calculation/display must match backend workflow state.
4) New and returning users must complete onboarding end-to-end without dead-ends.

Execution plan:
- Reproduce bug from mobile acceptance button through backend logs and DB verification.
- Patch acceptance endpoint and/or service logic for idempotent persistence and explicit error semantics.
- Patch mobile acceptance flow for robust loading/failure/retry handling and deterministic navigation after confirmed persistence.
- Align shared stage-state mapping across backend responses and React Native rendering.
- Confirm admin retrieval path exposes accepted applications with correct status.
- Preserve fallback data contracts for BVN/credit score placeholders until provider integrations are finalized.

Testing required:
- Integration test: first-time onboarding + loan acceptance writes DB record.
- Integration test: returning-user completion path has no stoppage.
- Failure-path test: simulated network drop during acceptance returns recoverable error and retry works without duplicate records.
- Stage test: each workflow state renders expected stage/progress in mobile.

Constraints:
- Do not invent business rules beyond existing docs.
- Do not modify out-of-scope modules.
- Do not refactor working code unless directly required to resolve sprint blockers.
- Flag any conflict between implementation and documented architecture/decisions.

Deliverables:
- Minimal, targeted code changes.
- Updated tests and pass/fail results.
- Short risk register (remaining blockers and dependencies).
- Handoff summary with what was completed, what failed, bugs found, gaps, decisions, technical debt, and next goal.