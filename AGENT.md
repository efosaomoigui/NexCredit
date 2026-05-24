# AGENT.md — AI-Powered Digital Lending Platform (Nigeria)

## What You Are Building

You are building a **risk-first digital micro-lending platform** for the Nigerian market. This is not a simple loan app — it is an intelligent underwriting operating system. Every line of code you write must serve the platform's north star: **disciplined risk management, capital preservation, and repayment quality over loan volume**.

---

## Architecture Overview

This is a **microservices system** composed of 9 independent service engines. Each engine owns a bounded domain and communicates via REST APIs and async queues (Redis + Celery).

```
Client Layer
  ├── Borrower Mobile App     → React Native + Expo
  ├── Admin Dashboard         → Next.js + TypeScript
  └── Collections Panel       → Next.js + TypeScript

API Gateway (JWT auth, RBAC, rate limiting)

Core Service Engines (FastAPI / Python)
  ├── Identity Engine         → KYC, BVN/NIN, selfie, deduplication
  ├── Risk Engine             → Credit scoring, fraud flags, tier assignment
  ├── Lending Engine          → Products, applications, agreements
  ├── Payment Engine          → Disbursement, repayment, virtual accounts
  ├── Collections Engine      → Overdue detection, reminders, escalation
  ├── Notification Engine     → SMS, email, WhatsApp
  ├── AI Intelligence Engine  → ML scoring, fraud detection, segmentation
  ├── Compliance Engine       → Audit logs, consent, NDPC
  └── CRM Engine              → Support tickets, contact history

Data Layer
  ├── PostgreSQL              → Primary store (UUIDs, ACID, JSONB)
  ├── Redis                   → Cache + Celery queue
  └── S3-compatible (GCS)     → KYC documents, agreements

External Integrations
  ├── Paystack                → Repayment collection
  ├── Flutterwave             → Loan disbursement
  ├── Monnify                 → Virtual accounts
  ├── Mono                    → Open banking / bank statements
  ├── Termii                  → SMS OTP and notifications
  ├── CRC Credit Bureau       → Primary bureau
  ├── FirstCentral            → Secondary bureau
  └── Youverify / Dojah       → BVN, NIN, selfie KYC
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend APIs | FastAPI (Python 3.11+) |
| Admin & Collections UI | Next.js 14 + TypeScript |
| Mobile App | React Native + Expo |
| Database | PostgreSQL 15 |
| Queue / Cache | Redis 7 + Celery |
| Object Storage | GCS (S3-compatible) |
| Containerisation | Docker + Docker Compose |
| Infrastructure | GCP VM (Phase 1) → GKE (Phase 2) |
| CI/CD | GitHub Actions |

---

## Core Non-Negotiable Rules

These rules must be enforced in every module you build:

1. **Semi-automated approvals only** — No loan is approved or disbursed without an admin human review step during Phase 1. AI outputs are recommendations, never decisions.
2. **All state transitions must be audit-logged** — Every status change on a loan, user, or KYC record must write an immutable row to `audit_logs` with actor, timestamp, and reason.
3. **UUIDs everywhere** — All primary keys are UUIDs. Never use sequential integer IDs.
4. **RBAC enforced at two layers** — API Gateway middleware AND inside each service endpoint. Roles: `borrower`, `agent`, `reviewer`, `admin`, `superadmin`.
5. **No raw SQL** — All queries via ORM with parameterised inputs only.
6. **Sensitive data encrypted at rest** — BVN, NIN, account numbers: AES-256. KYC documents in S3: AES-256 with 15-min pre-signed URL access.
7. **PII masked in logs** — Names, phone numbers, and emails must never appear in application logs.
8. **Webhooks must be idempotent** — Duplicate webhook delivery must never create duplicate records. Use payment reference as idempotency key.
9. **Capital limits enforced by code** — The system must refuse to disburse if the total disbursed amount would exceed the configured lending pool ceiling.
10. **FCCPC compliance** — Never request phone contact permissions in the mobile app. All loan terms must be shown before application submission.

---

## API Response Envelope

All API responses must follow this exact format:

```json
// Success
{ "success": true, "data": { ... }, "message": "Operation successful", "meta": { "page": 1, "total": 50 } }

// Error
{ "success": false, "error": { "code": "INSUFFICIENT_SCORE", "message": "Borrower does not meet minimum risk threshold", "field": null } }
```

---

## Loan Application State Machine

Every loan moves through these states in order. No skipping. No reverse transitions (except to REJECTED).

```
DRAFT → SUBMITTED → BUREAU_PENDING → SCORING → PENDING_REVIEW
     → APPROVED → AGREEMENT_PENDING → AGREEMENT_SIGNED → DISBURSE_PENDING → DISBURSED
     → ACTIVE → PARTIALLY_REPAID → FULLY_REPAID
                                 → OVERDUE → WRITTEN_OFF
     → REJECTED (from any pre-disbursement state)
```

---

## Risk Scoring Weights

When building the Risk Engine, apply these signal weights exactly:

| Signal | Weight |
|---|---|
| Credit Bureau Score | 35% |
| Bank Transaction Behaviour (Mono) | 25% |
| Internal Repayment History | 20% |
| Identity Confidence Score | 10% |
| Device & Behavioural Score | 10% |

Risk Tiers: A (80–100) = standard approval | B (60–79) = reduced limits + enhanced review | C (40–59) = senior sign-off required | D (<40) = auto-decline, superadmin override only.

---

## MVP Scope Boundaries

**In scope for Phase 1:**
- Borrower onboarding, KYC, bank linking
- Loan application and semi-manual underwriting
- Disbursement (Flutterwave) and repayment collection (Paystack/Monnify)
- Admin loan management, risk review, fraud queue
- Automated reminders and penalty application
- Compliance: audit logs, consent records
- Collections panel for overdue loans

**Hard out-of-scope for Phase 1:**
- Fully automated approvals
- Loans > ₦25,000 or tenor > 30 days
- Public app store release
- Cooperative or marketplace lending
- Investor capital pool management

---

## File & Folder Conventions

```
/services
  /identity_engine
  /risk_engine
  /lending_engine
  /payment_engine
  /collections_engine
  /notification_engine
  /ai_engine
  /compliance_engine
  /crm_engine

/shared
  /models        → SQLAlchemy ORM models
  /schemas       → Pydantic request/response schemas
  /auth          → JWT, RBAC middleware
  /encryption    → AES-256 field-level encryption utils
  /queue         → Celery task definitions

/admin-dashboard   → Next.js app
/collections-panel → Next.js app
/mobile-app        → React Native + Expo

/infra
  /docker
  /github-actions
  /migrations    → Alembic migrations
```

---

## Development Principles

- **Build one engine at a time.** Complete, test, and document each service before starting the next.
- **Seed realistic test data** for Nigerian borrower personas (salary earner, POS operator, logistics worker).
- **Mock all third-party APIs** in development with realistic response fixtures.
- **Write a test for every state transition** in the loan lifecycle state machine.
- **Never hardcode secrets** — all credentials via environment variables, loaded from `.env` (dev) or GCP Secret Manager (production).

---

## Prompts Directory

All modular build prompts live in `/prompts/`. Execute them in order:

| # | File | Covers |
|---|---|---|
| 01 | `01_project_scaffold.md` | Repo structure, Docker, env, CI skeleton |
| 02 | `02_database_schema.md` | PostgreSQL schema, Alembic migrations |
| 03 | `03_auth_identity_engine.md` | Auth, RBAC, OTP, KYC onboarding |
| 04 | `04_risk_engine.md` | Scoring model, bureau pull, fraud flags |
| 05 | `05_lending_engine.md` | Products, applications, agreements, state machine |
| 06 | `06_payment_engine.md` | Disbursement, repayment, virtual accounts |
| 07 | `07_collections_notification.md` | Overdue detection, reminders, escalation |
| 08 | `08_admin_dashboard.md` | Next.js admin UI, loan management, analytics |
| 09 | `09_borrower_mobile_app.md` | React Native app, full borrower journey |
| 10 | `10_ai_engine.md` | ML models, feature store, repayment scoring |
| 11 | `11_compliance_security.md` | Audit logs, consent, encryption, NDPC |
| 12 | `12_integrations.md` | All third-party API integrations |
| 13 | `13_collections_panel.md` | Collections agent UI |
| 14 | `14_infra_devops.md` | GCP, monitoring, backups, CI/CD |
