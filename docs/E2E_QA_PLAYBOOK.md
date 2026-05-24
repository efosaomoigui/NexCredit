# NexCredit End-to-End QA Playbook (Back-to-Front)

This is the **step-by-step**, **touch-everything** test plan for NexCredit across:
- Borrower Mobile App (React Native + Expo)
- Admin Dashboard (Next.js)
- Collections Panel (Next.js)
- Backend Engines (FastAPI microservices)

Use this document during manual testing and record every break in `docs/BREAK_LOG_TEMPLATE.csv`.

---

## 0) Ground Rules (Financial App)

1) **No “looks done”**: every screen, button, form, and flow must be exercised and verified against backend state.
2) **Audit evidence required**: any action that changes state must have an audit trail (API response + DB/audit entry where applicable).
3) **Negative testing is mandatory**: for disbursement and other integrations, deliberately hit error paths and verify safe handling.
4) **Credentials-driven**: when an integration requires credentials, pause and wire them properly (no hardcoded secrets).

---

## 1) Test Environment Setup (Local)

### 1.1 Start the stack
- Ensure `.env` is populated (use `.env.example` as baseline).
- Run: `docker-compose up --build`

### 1.2 Interfaces to open
| Interface | URL |
|---|---|
| Admin Dashboard | http://localhost:6100 |
| Collections Panel | http://localhost:3001 |
| Identity Engine Swagger | http://localhost:8001/docs |
| Lending Engine Swagger | http://localhost:8002/docs |
| Payment Engine Swagger | http://localhost:8003/docs |
| Risk Engine Swagger | http://localhost:8004/docs |

### 1.3 Demo credentials
From `TESTING.md`:
- `superadmin@demo.nexcredit.app` / `ChangeMe123!`
- `admin@demo.nexcredit.app` / `ChangeMe123!`
- `reviewer@demo.nexcredit.app` / `ChangeMe123!`
- `agent1@demo.nexcredit.app` / `ChangeMe123!`

---

## 2) Canonical End-to-End Flows (Must Pass)

Each flow below is written as a **sequence of atomic steps**. Treat each step as a test case and record failures with the Step ID.

### Flow F-01: Borrower Onboarding → KYC → Bank Linking → Loan Application → Admin Review → Agreement → Disbursement Attempt → Backend Acknowledgement

| Step ID | Area | Action | Expected |
|---|---|---|---|
| F-01.01 | Mobile | Open app, land on `LoginScreen` | App loads; no crash; clear error messages on offline |
| F-01.02 | Mobile/Auth | Login with test borrower or create path if supported | Token persisted; user lands on `HomeScreen` |
| F-01.03 | Mobile/Consent | Open `OnboardingConsentScreen`, accept consent | Consent persisted; cannot proceed without consent |
| F-01.04 | Mobile/KYC | Open `KYCScreen` / `KYCScreen.tsx` flows | KYC stepper works; validation errors are clear |
| F-01.05 | Backend/Identity | Verify Identity Engine receives KYC submission | API returns envelope `{success:true}`; record ID created |
| F-01.06 | Mobile/Bank | Open `BankLinkingScreen` and attempt linking | Success path OR controlled failure with actionable error |
| F-01.07 | Backend/Risk | Confirm risk scoring endpoint called or queued | Score exists OR explicit “not implemented” surfaced safely |
| F-01.08 | Mobile/Loan | Open `ApplyScreen` → fill and submit | Application created; status = `SUBMITTED` |
| F-01.09 | Admin/Applications | Find application in Admin Dashboard | Visible with correct borrower + timestamp |
| F-01.10 | Admin/Manual Review | Reviewer/admin action: move to `PENDING_REVIEW` → approve/reject | Transitions enforced; no skipping; reason required |
| F-01.11 | Admin/Agreement | Trigger agreement generation/sign flow | Agreement required before disbursement; errors are actionable |
| F-01.12 | Admin/Disbursement | Trigger disbursement attempt | Success in sandbox OR safe failure captured & shown |
| F-01.13 | Backend/Payment | Verify disbursement job/record created | Idempotency respected; status stored; audit log written |
| F-01.14 | Admin/Audit | Open audit logs page and confirm entries | Entries exist for all state transitions with actor + reason |
| F-01.15 | Mobile/Status | Check `ApprovalStatusScreen` / `DisbursementStatusScreen` | Matches backend truth; no stale state |

### Flow F-02: Repayment Initiation → Webhook Replay / Idempotency → Reconciliation

| Step ID | Area | Action | Expected |
|---|---|---|---|
| F-02.01 | Mobile/Repay | Open `RepayScreen`, initiate repayment | Payment intent created; clear next step shown |
| F-02.02 | Backend/Payment | Confirm repayment record created | Reference stored; status tracked |
| F-02.03 | Backend/Webhooks | Send same webhook payload twice | Second delivery does **not** duplicate repayment rows |
| F-02.04 | Admin/Loans | Confirm balance and status update | Balance decreases correctly; audit entry exists |

### Flow F-03: Loan Expiration → Overdue → Collections Queue → Agent Work → Resolution

| Step ID | Area | Action | Expected |
|---|---|---|---|
| F-03.01 | Backend/Data | Create/modify a loan due date to past (test-only) | Loan becomes overdue by rule; no manual hacks in UI |
| F-03.02 | Collections Panel/Queue | Open `Queue` | Overdue loan appears in correct bucket |
| F-03.03 | Admin/Assignments | Assign borrower/case to an agent | Assignment persisted; agent sees only assigned items |
| F-03.04 | Collections Panel/My Queue | Login as agent, open “My Queue” | Only assigned items visible |
| F-03.05 | Collections Panel/Case | Log call outcome / note / next action | Saved and visible; audit entry if state changes |
| F-03.06 | Backend/Collections | Trigger escalation/reminder where applicable | Messages queued (even if mocked); no duplicate reminders |

### Flow F-04: Disbursement Error-Path (Must Be Safe)

Goal: Even if “nothing is there now”, we must prove the system fails safely.

| Step ID | Area | Action | Expected |
|---|---|---|---|
| F-04.01 | Admin/Disbursement | Attempt disbursement with missing/invalid credentials | Clear error to admin; no partial state corruption |
| F-04.02 | Backend/Payment | Confirm failure status recorded | Status=`FAILED`; reason stored; idempotency preserved |
| F-04.03 | Admin/Audit | Verify audit trail | Actor + timestamp + reason captured |

---

## 3) Module-by-Module “Touch Everything” Checklists

### 3.1 Mobile App (React Native)
Screens (must be exercised end-to-end):
- `src/screens/auth/LoginScreen.tsx`: login, validation, error states
- `src/screens/main/HomeScreen.tsx`: summary widgets, navigation
- `src/screens/main/OnboardingConsentScreen.tsx`: consent gating
- `src/screens/main/KYCScreen.tsx`: KYC submission + retry
- `src/screens/main/BankLinkingScreen.tsx`: success + failure
- `src/screens/main/ReviewTermsScreen.tsx`: must show terms pre-submit
- `src/screens/main/ApplyScreen.tsx`: loan application
- `src/screens/main/ApprovalStatusScreen.tsx`: status refresh behavior
- `src/screens/main/DisbursementStatusScreen.tsx`: status refresh behavior
- `src/screens/main/LoansScreen.tsx`: list/history, states
- `src/screens/main/RepayScreen.tsx`: initiation + error states
- `src/screens/main/ProfileScreen.tsx`: PII display/masking rules
- `src/screens/main/SupportScreen.tsx`: support entry points

For each screen, verify:
- loading state, empty state, error state, offline behavior
- field validation (required, format, min/max)
- API envelope handling (`success`, `error.code`, `error.message`)

### 3.2 Admin Dashboard
Routes (must be exercised):
- Analytics: page loads, charts render, filters work
- Applications: list + detail, search, status changes, manual review gates
- Loans: list/detail, timeline, repayments, disbursement actions
- Borrowers: profile, KYC status, bank accounts, history
- Fraud: queues, flags, actions, audit evidence
- Audit: filter by actor/action/date, drill-down
- Operations: any operational actions, jobs, monitoring widgets
- Settings: users, products/rates, assignments (to be refined per requirements)

### 3.3 Collections Panel
Routes (must be exercised):
- Queue: buckets, sorting, filtering
- Cases: case details, notes/actions
- Activity: timeline, audit evidence
- Settings: agent preferences (if present)

---

## 4) Backend Engine Coverage (API + Evidence)

For every engine container, verify:
- Swagger loads
- `/health` (or equivalent) returns healthy (if available)
- Auth middleware protects privileged endpoints
- Response envelope matches `AGENT.md`

Engines:
- Identity Engine: auth, KYC scaffolds, users admin, assignments, dedup
- Lending Engine: products, applications, state transitions enforcement
- Risk Engine: scoring/tiering pipeline (currently a known gap)
- Payment Engine: disbursement, repayments, webhooks idempotency (known gap pending credentials)
- Collections/Notification/AI/Compliance/CRM engines: verify scaffolds, clearly label gaps

---

## 5) Settings Requirements to Validate (Admin)

These are **product requirements** that must be implemented and then tested:

1) **Dedicated Settings home page**: one place to see and manage all settings categories.
2) **Engine status + toggles**:
   - Default state = ON
   - Show green/red indicator per engine (running/healthy vs unhealthy/broken)
   - Ability to disable an engine (feature flag) for controlled testing
3) **Products / interest rate settings visible**:
   - Interest and product eligibility rules must be visible and editable via UI
   - No “blind internal” rates; UI must show current effective configuration
4) **Navigation change**:
   - Replace “Agent Assignment” in the left navigation with a clearer “Agents” / “Assignments” concept

---

## 6) Break Logging (How We Track and Fix)

For every break, create a row in `docs/BREAK_LOG_TEMPLATE.csv` with:
- Step ID (from this playbook)
- Module (mobile/admin/collections/backend)
- Severity (P0 blocks money movement, P1 blocks onboarding, P2 functional bug, P3 UX)
- Expected vs actual
- Screenshot/video reference (if available)
- Fix reference (branch/PR/commit) and retest result

---

## 7) “Stop the Line” Severity Rules

Immediate stop-and-fix before proceeding:
- Any money movement inconsistency
- Missing audit evidence for state transitions
- PII leakage in logs/UI
- Any path that can disburse without manual review (Phase 1)

---

## 8) Credentials & Integration Wiring Checklist (Pause Here When Needed)

This repo currently contains **mocked** integrations in several places. For bank-backed pilots, you will replace mocks with real provider calls and set real credentials in `.env` (never in code).

| Surface | Current state in code | What you need to test “for real” |
|---|---|---|
| KYC (BVN/NIN/selfie) | Identity Engine routes use Youverify mock responses | Real Youverify/Dojah keys + real provider client wiring |
| Credit bureau | Risk Engine bureau service raises `NotImplementedError` for unsupported providers | CRC + FirstCentral credentials and provider integration selection |
| Open banking (bank statements) | Settings default to mock keys | Mono credentials + bank-linking callback/webhooks |
| SMS/notifications | Shared Termii mock exists | Termii keys + message sending + retry logic |
| Repayments/webhooks | Payment Engine webhook secrets fall back to mock values | Real webhook signing secrets + replay/idempotency tests |
| Bank partnership (“Stellas”) | `STELLAS_SECRET_KEY` defaults to mock | Bank-provided signing secret + production callback verification |

Minimum `.env` items to confirm before testing integrations:
- Paystack: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`
- Flutterwave: `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` (and encryption key if used)
- Monnify: `MONNIFY_API_KEY`, `MONNIFY_SECRET_KEY`, `MONNIFY_CONTRACT_CODE`
- Mono: `MONO_SECRET_KEY`, `MONO_WEBHOOK_SECRET`
- Termii: `TERMII_API_KEY`
- KYC: `YOUVERIFY_API_KEY` and/or `DOJAH_*`
- Bureaus: `CRC_*`, `FIRSTCENTRAL_*`
- Bank partner: `STELLAS_SECRET_KEY` (or bank-equivalent secret)

