"""
services/lending_engine/app/services/agreements.py
--------------------------------------------------
Loan agreement generation and template management.
"""
import uuid
from typing import Optional
from jinja2 import Template
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import LoanApplication, LoanProduct, User, BorrowerProfile

AGREEMENT_TEMPLATE = """
# LOAN AGREEMENT

**Borrower Name:** {{ borrower_name }}
**Loan ID:** {{ loan_id }}
**Date:** {{ date }}

## Loan Terms
- **Principal Amount:** ₦{{ principal }}
- **Interest Rate:** {{ interest_rate }}% (Flat)
- **Total Interest Amount:** ₦{{ interest_amount }}
- **Total Repayment Amount:** ₦{{ total_repayment }}
- **Tenor:** {{ tenor }} Days
- **Due Date:** {{ due_date }}

## Terms and Conditions
1. The Borrower agrees to repay the total amount of ₦{{ total_repayment }} on or before the due date.
2. Interest is calculated at a flat rate of {{ interest_rate }}% on the principal.
3. Consequences of Default: Failure to repay on time will result in daily penalties and reporting to credit bureaus.

**I explicitly accept the terms of this loan agreement.**
"""

class AgreementService:
    @staticmethod
    async def generate_agreement(session: AsyncSession, application_id: uuid.UUID) -> str:
        """
        Generates a plain-text loan agreement based on application data.
        """
        # Fetch data
        stmt = select(LoanApplication).where(LoanApplication.id == application_id)
        result = await session.execute(stmt)
        app = result.scalar_one_or_none()
        
        stmt = select(LoanProduct).where(LoanProduct.id == app.product_id)
        result = await session.execute(stmt)
        product = result.scalar_one_or_none()
        
        stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == app.user_id)
        result = await session.execute(stmt)
        profile = result.scalar_one_or_none()
        
        borrower_name = profile.full_name if profile else "Valued Customer"
        
        # Calculations
        principal = app.approved_amount or app.requested_amount
        interest_rate_decimal = product.interest_rate
        interest_amount = int(principal * interest_rate_decimal)
        total_repayment = principal + interest_amount
        
        from datetime import datetime, timedelta
        due_date = (datetime.now() + timedelta(days=app.tenor)).strftime("%Y-%m-%d")
        
        # Render template
        template = Template(AGREEMENT_TEMPLATE)
        content = template.render(
            borrower_name=borrower_name,
            loan_id=str(app.id),
            date=datetime.now().strftime("%Y-%m-%d"),
            principal=f"{principal:,}",
            interest_rate=float(interest_rate_decimal * 100),
            interest_amount=f"{interest_amount:,}",
            total_repayment=f"{total_repayment:,}",
            tenor=app.tenor,
            due_date=due_date
        )
        
        return content
