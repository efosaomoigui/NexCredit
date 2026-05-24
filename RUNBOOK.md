# NexCredit Production Operations Runbook

This runbook is a living document and must be updated as bank/payment integrations move from sandbox to production.

## Deployment

1. Approval: Every PR to `main` must pass CI.
2. Staging: Deployment to staging is automatic.
3. Production: Go to GitHub Actions -> Deploy Production -> Approve.

## Incident Response

### P1: Disbursement Failure

- Diagnosis: Check provider dashboard/logs for insufficient funds, invalid keys, or rejected transfers.
- Action: Fund the settlement/float account or rotate API secrets.
- Retry: Re-enqueue disbursement task with the same idempotency key.

### P1: Repayment Webhook Failures / Reconciliation Drift

- Diagnosis: Compare webhook event counts vs stored repayment rows for the same period; check idempotency keys.
- Action: Re-run reconciliation for the affected window; confirm webhook signing secret.
- Prevention: Webhooks must be idempotent; duplicates must not create duplicate repayment rows.

### P1: High Error Rate (>5%)

- Diagnosis: Check Cloud Logging with filter `severity >= ERROR`.
- Action: Revert last deployment if error spike correlates with deploy.

## Backups & Restoration

- PostgreSQL: Automated daily snapshots at 02:00 WAT.
- Restore Test: Monthly restore of latest snapshot to staging and verify key counts and spot-check integrity.
- KYC Files: Storage bucket versioning enabled; lifecycle policy to cold storage for older artifacts.

## Security

- Secret rotation: Rotate JWT keys/secrets and third-party API keys every 90 days.
- Audit: Review `audit_logs` weekly for unauthorized admin actions.
- Logging: Logs retained per compliance policy; ensure PII masking is enforced.

## Bank Partnership Notes

- Integration surfaces and responsibilities: `docs/BANK_PARTNERSHIP.md`.
- Confirm Phase 1 constraints before go-live:
  - Max loan amount/tenor must match `AGENT.md` defaults.
  - No automated approvals in Phase 1; human review remains mandatory.

## Local Dev Startup Latency (Admin)

- Symptom: first click on Admin Dashboard after restart can be slow because Next.js dev server compiles routes on first hit and backend engines may still be cold.
- Pre-warm command (PowerShell):
  - `.\scripts\prewarm-admin.ps1`
- Optional authenticated warm-up:
  - `.\scripts\prewarm-admin.ps1 -Token "<staff_access_token>"`
- What is warmed:
  - `/login`
  - `/api/auth/me`
  - `/api/system/engines`
  - `/api/admin/lending-products`

### Startup Sequencing Note

- For local Docker runs, start `postgres`, `identity_engine`, and `lending_engine` before first Admin Dashboard navigation when possible.
- If startup races occur, run the pre-warm script after containers report healthy to reduce first-request latency spikes.
