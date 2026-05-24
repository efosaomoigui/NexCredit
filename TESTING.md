# NexCredit Local Testing Guide

The full microservices stack is being orchestrated via Docker Compose. Use this guide to verify the platform.

## 1. Accessing the Interfaces
| Interface | URL | Description |
|---|---|---|
| **Admin Dashboard** | [http://localhost:6100](http://localhost:6100) | For underwriters, fraud analysts, and management. |
| **Collections Panel** | [http://localhost:3001](http://localhost:3001) | For collections agents managing overdue loans. |
| **Identity Engine (API)** | [http://localhost:8001/docs](http://localhost:8001/docs) | Swagger documentation for the Identity service. |
| **Lending Engine (API)** | [http://localhost:8002/docs](http://localhost:8002/docs) | Swagger documentation for the Lending service. |

## 2. Default Test Credentials
- **Superadmin**: `superadmin@demo.nexcredit.app` / `ChangeMe123!`
- **Admin**: `admin@demo.nexcredit.app` / `ChangeMe123!`
- **Reviewer**: `reviewer@demo.nexcredit.app` / `ChangeMe123!`
- **Agent**: `agent1@demo.nexcredit.app` / `ChangeMe123!`

## 3. Recommended Test Flow
1. **KYC Onboarding**:
   - Open the **Admin Dashboard**.
   - Navigate to **Identity Verification**.
   - Create a test borrower profile and verify their BVN (Simulated via Youverify Mock).
2. **Loan Application**:
   - Apply for a loan through the Lending Engine API (Swagger).
   - Verify that the **Risk Engine** computes a score and risk tier.
3. **Approval & Disbursement**:
   - Approve the loan in the Admin Dashboard.
   - Verify that the **Payment Engine** initiates a disbursement (Simulated via Flutterwave Mock).
4. **Collections (Simulated Overdue)**:
   - Manually update a loan's due date in the DB to yesterday.
   - Open the **Collections Panel**.
   - Verify the loan appears in the **Active Queue**.

> Note: Collections “My Queue” is assignment-driven. Use Admin → Settings → Agent Assignments to assign demo borrowers to an agent.

## 4. Monitoring Logs
To view logs for all services:
```bash
docker-compose logs -f
```

To see only a specific service:
```bash
docker-compose logs -f identity_engine
```
