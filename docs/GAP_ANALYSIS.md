# NexCredit Gap Analysis (AGENT.md vs Current Build)

This document summarizes the current build status against `AGENT.md` and highlights what must be completed before production/bank-integrated go-live.

## Service Engines — Status

- **Identity Engine**: Implemented for staff auth (DB-backed) + JWT issuance; KYC endpoints scaffolded.
- **Risk Engine**: **Gap** — scoring weights exist in `AGENT.md`, but bureau pull + tiering pipeline not wired.
- **Lending Engine**: **Partial** — state machine documented; enforcement + manual review gates + agreement flow not complete.
- **Payment Engine**: **Gap** — disbursement + repayment integrations pending real credentials / partner connectivity.
- **Collections Engine**: **Gap** — overdue detection, penalty calc, escalation logic not implemented as an engine.
- **Notification Engine**: **Gap** — Termii SMS/WhatsApp reminders not built as an engine.
- **AI Intelligence Engine**: **Gap** — Phase 1 should use rule-based fallback; ML can come later.
- **Compliance Engine**: **Partial** — audit log table exists; end-to-end audit coverage still missing.
- **CRM Engine**: **Gap** — tickets/contact history not started.

## “Production-Ready” Gaps (Must Close)

1) **Money movement**: Virtual accounts + repayment reconciliation + disbursement must be implemented with strict idempotency.
2) **Risk scoring**: Implement the 5-signal weighted scorer and tier A–D output.
3) **Lending state machine enforcement**: No skipping states; all transitions audit-logged.
4) **PII encryption + log masking**: BVN/NIN/account numbers encrypted at rest; masked in logs.
5) **Collections automation**: Overdue job + reminders + escalation rules + penalties.
6) **Capital ceiling enforcement**: hard block disbursement above configured ceiling; superadmin override only.

## Scope Alignment Items (Resolve Before Go-Live)

- **Loan limits**: `AGENT.md` caps Phase 1 at ₦25,000 / 30 days; marketing/proposal must match.
- **No automated approvals**: Phase 1 requires human review; language in proposals must not imply auto-approval.
- **RBAC roles**: Bank/internal operations require explicit roles and restrictions (agent/reviewer/admin/superadmin).
- **Credit bureaus**: Confirm CRC + FirstCentral access path and credentials/contracting.

