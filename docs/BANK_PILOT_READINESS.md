# Bank Pilot Readiness Checklist (Phase 1)

Use this checklist before any bank-backed pilot, demos, or marketing claims.

## Product & Risk Controls

- Phase 1 caps confirmed (amount + tenor) and aligned to comms/marketing.
- No automated approvals: admin/reviewer gate is enforced in the Lending flow.
- Risk scoring pipeline implemented (weights per `AGENT.md`) and produces tier A–D.
- Fraud flags and escalation rules defined and testable.

## Money Movement

- Virtual accounts provisioning working for every borrower (sandbox + prod plans).
- Repayment reconciliation implemented and idempotent.
- Disbursement integration implemented and idempotent.
- Capital ceiling enforcement blocks over-limit disbursements.

## Compliance & Security

- Audit logging implemented for every state transition (loan, user, KYC, repayments, escalations).
- PII encryption at rest for BVN/NIN/account number fields.
- PII masked in logs (names/phones/emails never logged).
- Secrets management plan for production (no secrets in repo; rotate policy defined).

## Operations

- Runbook validated (`RUNBOOK.md`) with incident scenarios for repayments/disbursements.
- Monitoring + alert thresholds configured (error rate, webhook failures, queue delays).
- Backup/restore tested for Postgres.

## Roles & Access

- RBAC enforced:
  - at gateway (when introduced)
  - and within services (already required)
- Agent assignments enforced:
  - agents can only see assigned borrowers/cases
  - admin can assign/unassign via Admin Dashboard

