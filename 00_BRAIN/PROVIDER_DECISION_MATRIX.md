# PROVIDER_DECISION_MATRIX.md — NexCredit
## Last Updated: 2026-05-19

Purpose: lock one primary + one fallback provider per capability so integration is fast, low-cost, and consistent across sprints.

## Decision Principles
- Prefer the minimum number of external vendors.
- Keep mobile flow unblocked with deterministic backend fallbacks.
- Use test/sandbox mode first, then swap to live with unchanged contracts.

## Provider Matrix
| Capability | Primary Provider | Fallback Provider | Current Backend Fallback | Current Status | Owner | Notes |
|---|---|---|---|---|---|---|
| OTP delivery (SMS/WhatsApp/Email) | Termii | Internal OTP store fallback (Redis/in-memory + debug OTP) | Yes | PARTIAL | Backend | Works in fallback mode when provider fails. |
| BVN verification | Paystack Identity (if account enabled) | Youverify/Dojah (pick one only) | `test_bvn_identities` table | PARTIAL | Backend/Product | Keep one non-Paystack identity backup vendor only. |
| NIN verification | Single KYC vendor (Youverify or Dojah or Prembly) | Internal fallback response | Yes | PARTIAL | Backend/Product | Choose one vendor, avoid multi-vendor duplication. |
| Face/liveness | Single KYC vendor (Dojah or Smile ID) | Internal mock selfie pass | Yes | PARTIAL | Backend/Product | Required for production rigor; fallback keeps dev flow alive. |
| Bank account resolution (NUBAN) | Paystack | Mono/Paystack direct bank list fallback | Existing mock + profile name match | PARTIAL | Backend | Replace mock bank-account match with Paystack resolve endpoint. |
| Credit score check | Internal deterministic score (dev) | CRC/XDS via one integration later | `credit_bureau_reports` table seeded | READY (dev) | Backend/Risk | Use internal now; plug bureau provider in dedicated sprint. |
| Loan disbursement | Paystack Transfers | Flutterwave Transfers | Internal disbursement fallback paths | PARTIAL | Backend/Finance | Webhook-confirmed status must drive final state. |
| Repayment initiation/collection | Paystack Initialize/Verify | Flutterwave charge | Manual fallback mode with reference | PARTIAL | Backend/Finance | No raw 500; return controlled fallback when provider unavailable. |
| Webhook confirmation | Paystack webhooks | Provider polling endpoint | `webhook_logs` + idempotent handlers | PARTIAL | Backend | Must verify signature and enforce idempotency. |

## Chosen Low-Cost Vendor Set (Now)
1. Paystack (payments, transfers, bank resolution, possible BVN identity where enabled)
2. One KYC vendor only (choose one: Dojah or Youverify or Prembly)

## Dev Fallback Tables in Active Use
- `test_bvn_identities`
- `credit_bureau_reports`
- `kyc_records`
- `verification_logs`
- `borrower_profiles`
- `bank_accounts`

## Immediate Next Decisions Required
1. Choose one KYC vendor for NIN + face/liveness backup to Paystack identity.
2. Confirm Paystack identity endpoints enabled on your account (BVN resolution/match).
3. Confirm webhook public URL strategy for test mode.

## Out of Scope (for this matrix version)
- Final production pricing negotiation
- Multi-country expansion provider logic
- Advanced fraud orchestration beyond current sprint blockers
