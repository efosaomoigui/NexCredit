# Bank Partnership Integration Checklist (NexCredit)

This is the practical checklist and documentation for partnering with a bank/fintech (e.g., Stellas) to unlock repayment collection, disbursement, and compliance posture.

## 1) Integration Surfaces (What We Need From the Bank)

**A. Virtual Accounts (per borrower)**
- API to create/provision a virtual account per borrower.
- Webhooks/events for inbound transfers.
- Reconciliation fields: reference, amount, payer details, timestamp.
- Idempotency keys and replay handling.

**B. Disbursement**
- API to initiate disbursement to a borrower’s verified bank account.
- Status callbacks/webhooks (pending/success/failed/reversed).
- Settlement account/float arrangement and limits.

**C. Identity & KYC**
- Confirmation on KYC responsibilities: what is done by NexCredit vs the bank’s framework.
- BVN/NIN verification providers (Youverify/Dojah) and who contracts/pays.

**D. Compliance/AML**
- Required logs for audits and dispute resolution.
- AML monitoring expectations and suspicious activity escalation process.

## 2) Non‑Negotiables (AGENT.md Alignment)

- **No fully automated approvals (Phase 1)**: every loan requires human review before approval/disbursement.
- **Audit logs for every state transition**: approval, rejection, KYC decision, disbursement, repayment, escalation.
- **UUIDs everywhere** (already the DB standard in this repo).
- **RBAC enforced** at gateway and at each service endpoint.
- **Encryption at rest** for BVN/NIN/account number fields; **PII masked** in application logs.
- **Webhooks idempotent**: duplicates must not create duplicate repayments/disbursements.
- **Capital ceiling enforced by code**: block disbursement if it would exceed configured ceiling.

## 3) Data Contracts (Minimum)

**Repayment webhook payload must include**
- `transaction_reference` (idempotency key)
- `amount`
- `currency`
- `account_number` (or virtual account ID)
- `narration`
- `timestamp`

**Disbursement callback must include**
- `disbursement_reference` (idempotency key)
- `status`
- `reason` (on failure)
- `timestamp`

## 4) Operating Model (Roles)

Suggested roles (aligns with `AGENT.md`):
- `superadmin`: platform overrides, emergency controls, ceiling overrides
- `admin`: operations, user/agent management, assignments
- `reviewer`: underwriting decisions, fraud queue triage
- `agent`: collections follow-up for assigned borrowers only
- `borrower`: end user (mobile)

## 5) Go‑Live Requirements (Minimum)

Before production marketing / bank pilot:
- Implement payment + webhook handling (idempotent, audited).
- Implement risk scoring pipeline and tier assignment.
- Implement lending state machine enforcement + audited manual review gates.
- Implement collections engine automation (overdue detection + escalation rules + penalties).
- Security hardening: production JWT keys (RS256), secrets management, logging masks.

## 6) Local Environment Notes

- Admin Dashboard: `http://localhost:6100`
- Collections Panel: `http://localhost:3001`
- Identity Engine: `http://localhost:8001`

Demo users are seeded via `infra/migrations/seed.py`.

