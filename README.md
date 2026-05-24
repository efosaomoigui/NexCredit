# NexCredit — AI-Powered Digital Micro-Lending Platform

Risk-first digital lending infrastructure for the Nigerian market.

## Quick Start (Local)

```powershell
# 1) Copy environment template
Copy-Item .env.example .env

# 2) Start the stack
docker compose up -d --build

# 3) Run DB migrations
$env:PYTHONPATH='.'; python -m alembic upgrade head

# 4) Seed demo data (users/borrowers)
$env:PYTHONPATH='.'; python infra\migrations\seed.py seed
```

## Service Endpoints (dev)

| Service | URL |
|---|---|
| Identity Engine | http://localhost:8001 |
| Admin Dashboard | http://localhost:6100 |
| Collections Panel | http://localhost:3001 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

## Demo Login (seeded in Postgres)

- superadmin@demo.nexcredit.app / ChangeMe123!
- admin@demo.nexcredit.app / ChangeMe123!
- reviewer@demo.nexcredit.app / ChangeMe123!
- agent1@demo.nexcredit.app / ChangeMe123!

## Documentation

- Architecture + non-negotiables: AGENT.md
- Local test guide: TESTING.md
- Bank partnership & integration checklist: docs/BANK_PARTNERSHIP.md
- Current build gaps (AGENT.md vs build): docs/GAP_ANALYSIS.md

## Notes

- Chromium-based browsers block port 6000 as “unsafe”; Admin runs on 6100.
