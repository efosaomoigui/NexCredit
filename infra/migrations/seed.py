"""
infra/migrations/seed.py
------------------------
Development/demo data seeding script.

Usage (PowerShell):
  $env:PYTHONPATH='.'
  python infra/migrations/seed.py seed
  python infra/migrations/seed.py unseed
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime
from decimal import Decimal

from passlib.context import CryptContext
from sqlalchemy import delete, select, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from shared.models import (
    AdminUser,
    AgentAssignment,
    BorrowerProfile,
    Gender,
    LoanProduct,
    SimBankAccount,
    SimCreditProfile,
    TestBvnIdentity,
    User,
    UserRole,
    UserStatus,
)

# We use a dummy key for seeding if not set (dev only)
os.environ.setdefault(
    "AES_ENCRYPTION_KEY",
    "0000000000000000000000000000000000000000000000000000000000000000",
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://nexcredit:changeme@localhost:5433/lending_dev",
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

DEMO_EMAIL_DOMAIN = "demo.nexcredit.app"
LEGACY_DEMO_EMAIL_DOMAINS = {"demo.nexcredit.local"}
DEMO_PASSWORD = "ChangeMe123!"


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


async def seed_data() -> None:
    async with AsyncSessionLocal() as session:
        await _seed_staff_users(session)
        await _seed_loan_products(session)
        await _seed_borrowers(session)
        await _seed_assignments(session)
        await _seed_simulation_data(session)
        await session.commit()

    print("Seed complete.")
    print(f"Staff demo password: {DEMO_PASSWORD}")


async def unseed_data() -> None:
    async with AsyncSessionLocal() as session:
        demo_user_ids = await _get_demo_user_ids(session)
        if not demo_user_ids:
            print("No demo users found.")
            return

        await session.execute(delete(BorrowerProfile).where(BorrowerProfile.user_id.in_(demo_user_ids)))
        await session.execute(delete(AdminUser).where(AdminUser.user_id.in_(demo_user_ids)))
        await session.execute(delete(User).where(User.id.in_(demo_user_ids)))
        await session.commit()

    print("Unseed complete.")


async def _get_demo_user_ids(session: AsyncSession) -> list:
    domains = [DEMO_EMAIL_DOMAIN, *sorted(LEGACY_DEMO_EMAIL_DOMAINS)]
    clauses = [User.email.like(f"%@{d}") for d in domains]
    stmt = select(User.id).where(or_(*clauses))
    rows = (await session.execute(stmt)).all()
    return [r[0] for r in rows]


async def _seed_staff_users(session: AsyncSession) -> None:
    staff_seed = [
        {
            "phone": "+2348000000000",
            "email": f"superadmin@{DEMO_EMAIL_DOMAIN}",
            "role": UserRole.SUPERADMIN,
            "display_name": "NexCredit SuperAdmin",
            "department": "Executive",
        },
        {
            "phone": "+2348000000001",
            "email": f"admin@{DEMO_EMAIL_DOMAIN}",
            "role": UserRole.ADMIN,
            "display_name": "NexCredit Admin",
            "department": "Operations",
        },
        {
            "phone": "+2348000000002",
            "email": f"reviewer@{DEMO_EMAIL_DOMAIN}",
            "role": UserRole.REVIEWER,
            "display_name": "NexCredit Reviewer",
            "department": "Risk",
        },
        {
            "phone": "+2348000000003",
            "email": f"agent1@{DEMO_EMAIL_DOMAIN}",
            "role": UserRole.AGENT,
            "display_name": "Agent One",
            "department": "Collections",
        },
    ]

    for staff in staff_seed:
        existing = (
            await session.execute(
                select(User).where((User.email == staff["email"]) | (User.phone == staff["phone"]))
            )
        ).scalar_one_or_none()
        if existing:
            continue

        user = User(
            phone=staff["phone"],
            email=staff["email"],
            password_hash=_hash_password(DEMO_PASSWORD),
            role=staff["role"],
            status=UserStatus.ACTIVE,
            last_login_at=None,
        )
        session.add(user)
        await session.flush()

        session.add(
            AdminUser(
                user_id=user.id,
                display_name=staff["display_name"],
                role=staff["role"],
                department=staff["department"],
                is_active=True,
                last_login_at=None,
            )
        )


async def _seed_loan_products(session: AsyncSession) -> None:
    products = [
        LoanProduct(
            name="QuickCash 14",
            description="Fast micro-loan for 14 days. Max ₦15,000.",
            min_amount=2000,
            max_amount=15000,
            min_tenor=14,
            max_tenor=14,
            interest_rate=Decimal("0.1250"),
            fees={"processing_fee": 500},
            is_active=True,
        ),
        LoanProduct(
            name="QuickCash 30",
            description="Flexible micro-loan for 30 days. Max ₦25,000.",
            min_amount=5000,
            max_amount=25000,
            min_tenor=30,
            max_tenor=30,
            interest_rate=Decimal("0.2000"),
            fees={"processing_fee": 1000, "management_fee": 500},
            is_active=True,
        ),
    ]

    for product in products:
        existing = (await session.execute(select(LoanProduct).where(LoanProduct.name == product.name))).scalar_one_or_none()
        if existing:
            continue
        session.add(product)


async def _seed_borrowers(session: AsyncSession) -> None:
    borrowers = [
        {
            "phone": "+2348123456789",
            "email": f"john.doe@{DEMO_EMAIL_DOMAIN}",
            "name": "John Doe",
            "employment_type": "Salaried",
            "income": 150000,
            "employer": "Lagos Tech Solutions",
            "gender": Gender.MALE,
        },
        {
            "phone": "+2348098765432",
            "email": f"jane.smith@{DEMO_EMAIL_DOMAIN}",
            "name": "Jane Smith",
            "employment_type": "POS Operator",
            "income": 80000,
            "employer": "Self-Employed",
            "gender": Gender.FEMALE,
        },
    ]

    for b in borrowers:
        existing = (
            await session.execute(select(User).where((User.email == b["email"]) | (User.phone == b["phone"])))
        ).scalar_one_or_none()
        if existing:
            continue

        user = User(
            phone=b["phone"],
            email=b["email"],
            password_hash=_hash_password("Borrower123!"),
            role=UserRole.BORROWER,
            status=UserStatus.ACTIVE,
            last_login_at=None,
        )
        session.add(user)
        await session.flush()

        session.add(
            BorrowerProfile(
                user_id=user.id,
                full_name=b["name"],
                dob=datetime(1990, 1, 1),
                gender=b["gender"],
                address="123 Example Street, Lagos",
                state_of_residence="Lagos",
                employer=b["employer"],
                employment_type=b["employment_type"],
                monthly_income=b["income"],
                bvn_verified=True,
                nin_verified=True,
            )
        )


async def _seed_assignments(session: AsyncSession) -> None:
    """
    Seed basic borrower→agent assignments for demo flows.
    Safe to run repeatedly.
    """
    try:
        agent = (
            await session.execute(select(User).where(User.email == f"agent1@{DEMO_EMAIL_DOMAIN}"))
        ).scalar_one_or_none()
        if not agent:
            return

        borrowers = (
            await session.execute(
                select(User).where(
                    (User.role == UserRole.BORROWER)
                    & (User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"))
                )
            )
        ).scalars().all()

        for b in borrowers:
            existing = (
                await session.execute(
                    select(AgentAssignment).where(
                        (AgentAssignment.agent_id == agent.id) & (AgentAssignment.borrower_id == b.id)
                    )
                )
            ).scalar_one_or_none()
            if existing:
                if not existing.is_active:
                    existing.is_active = True
                continue
            session.add(AgentAssignment(agent_id=agent.id, borrower_id=b.id, is_active=True))
    except Exception:
        # If the migration hasn't been applied yet, skip silently.
        return


async def _seed_simulation_data(session: AsyncSession) -> None:
    """
    Seed simulation datasets used by fallback provider APIs:
    - test_bvn_identities
    - sim_credit_profiles
    - sim_bank_accounts
    """
    bvn_rows = [
        ("22345678901", "+2348091110001", "Ada", "Okafor", datetime(1994, 8, 21).date()),
        ("22567890123", "+2348091110002", "Musa", "Bello", datetime(1989, 1, 9).date()),
        ("22789012345", "+2348091110003", "Kemi", "Adebayo", datetime(1996, 11, 3).date()),
        ("22901234567", "+2348091110004", "Chinedu", "Nwosu", datetime(1992, 5, 14).date()),
    ]
    for bvn, phone, first, last, dob in bvn_rows:
        exists = (await session.execute(select(TestBvnIdentity).where(TestBvnIdentity.bvn == bvn))).scalar_one_or_none()
        if not exists:
            session.add(
                TestBvnIdentity(
                    bvn=bvn,
                    phone=phone,
                    first_name=first,
                    last_name=last,
                    dob=dob,
                    is_active=True,
                )
            )

    credit_rows = [
        ("22345678901", 78, "A", "low", 250000, "approve"),
        ("22567890123", 62, "B", "medium", 150000, "manual_review"),
        ("22789012345", 54, "C", "medium", 90000, "manual_review"),
        ("22901234567", 48, "D", "high", 50000, "decline"),
    ]
    for bvn, score, band, risk, limit, hint in credit_rows:
        exists = (await session.execute(select(SimCreditProfile).where(SimCreditProfile.bvn == bvn))).scalar_one_or_none()
        if not exists:
            session.add(
                SimCreditProfile(
                    bvn=bvn,
                    score=score,
                    score_band=band,
                    risk_level=risk,
                    recommended_limit=limit,
                    decision_hint=hint,
                    is_current=True,
                )
            )

    bank_rows = [
        ("044", "Access Bank", "0123456789", "Ada Okafor", "22345678901"),
        ("058", "GTBank", "0234567890", "Musa Bello", "22567890123"),
        ("033", "UBA", "0345678901", "Kemi Adebayo", "22789012345"),
        ("057", "Zenith Bank", "0456789012", "Chinedu Nwosu", "22901234567"),
    ]
    for bank_code, bank_name, account_number, account_name, bvn in bank_rows:
        exists = (
            await session.execute(
                select(SimBankAccount).where(
                    SimBankAccount.bank_code == bank_code,
                    SimBankAccount.account_number == account_number,
                )
            )
        ).scalar_one_or_none()
        if not exists:
            session.add(
                SimBankAccount(
                    bank_code=bank_code,
                    bank_name=bank_name,
                    account_number=account_number,
                    account_name=account_name,
                    bvn=bvn,
                    is_active=True,
                )
            )


if __name__ == "__main__":
    cmd = (sys.argv[1] if len(sys.argv) > 1 else "seed").lower()
    if cmd in {"seed", "demo"}:
        asyncio.run(seed_data())
    elif cmd in {"unseed", "clean"}:
        asyncio.run(unseed_data())
    else:
        raise SystemExit("Usage: python infra/migrations/seed.py [seed|unseed]")
