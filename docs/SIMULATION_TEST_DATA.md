# Simulation Test Data (Sprint 2)

This file lists the seeded simulation datasets used by fallback provider checks in development.

## How it works
- `BVN` checks read from `test_bvn_identities`.
- `Credit` checks read from `sim_credit_profiles`.
- `Bank lookup` checks read from `sim_bank_accounts`.
- If data is not in these tables, the check will fail (expected behavior).

## 1) BVN Simulation Records
Use these BVNs during onboarding KYC tests.

| BVN | Phone | First Name | Last Name | DOB |
|---|---|---|---|---|
| 22345678901 | +2348091110001 | Ada | Okafor | 1994-08-21 |
| 22567890123 | +2348091110002 | Musa | Bello | 1989-01-09 |
| 22789012345 | +2348091110003 | Kemi | Adebayo | 1996-11-03 |
| 22901234567 | +2348091110004 | Chinedu | Nwosu | 1992-05-14 |

## 2) Credit Simulation Records
These are tied to BVN values above.

| BVN | Score (0-100) | Band | Risk Level | Recommended Limit (NGN) | Decision Hint |
|---|---:|---|---|---:|---|
| 22345678901 | 78 | A | low | 250000 | approve |
| 22567890123 | 62 | B | medium | 150000 | manual_review |
| 22789012345 | 54 | C | medium | 90000 | manual_review |
| 22901234567 | 48 | D | high | 50000 | decline |

## 3) Bank Simulation Records
Bank verification requires matching `bank_code + account_number`.

| Bank Name | Bank Code | Account Number | Account Name | BVN Link |
|---|---|---|---|---|
| Access Bank | 044 | 0123456789 | Ada Okafor | 22345678901 |
| GTBank | 058 | 0234567890 | Musa Bello | 22567890123 |
| UBA | 033 | 0345678901 | Kemi Adebayo | 22789012345 |
| Zenith Bank | 057 | 0456789012 | Chinedu Nwosu | 22901234567 |

## API Test Examples
Base URL: `http://localhost:8888/api/v1`

### BVN verify (simulation endpoint)
```bash
curl -X POST http://localhost:8888/api/v1/simulation/bvn/verify \
  -H "Content-Type: application/json" \
  -d '{"bvn":"22345678901"}'
```

### Credit score (simulation endpoint)
```bash
curl -X POST http://localhost:8888/api/v1/simulation/credit/score \
  -H "Content-Type: application/json" \
  -d '{"bvn":"22345678901"}'
```

### Bank lookup (simulation endpoint)
```bash
curl -X POST http://localhost:8888/api/v1/simulation/bank/lookup \
  -H "Content-Type: application/json" \
  -d '{"bank_code":"044","account_number":"0123456789"}'
```

## Mobile Flow Note
On bank linking, user must pick a bank and enter an account number that maps to a seeded `bank_code + account_number` pair above.

## Refresh Seed Data
If needed:
```bash
python infra/migrations/seed.py seed
```
