"""
services/lending_engine/app/api/v1/routes/servicing.py
------------------------------------------------------
Borrower servicing endpoints (dashboard summary).
"""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth.deps import get_current_user
from shared.database import get_db
from shared.models import Loan, LoanProduct, LoanStatus, User
from shared.response import success_response

router = APIRouter(prefix="/user", tags=["Servicing"])


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Main app dashboard payload for mobile home screen.
    """
    loans_stmt = select(Loan).where(Loan.user_id == user.id).order_by(Loan.created_at.desc())
    loans = (await db.execute(loans_stmt)).scalars().all()
    active_loan = next(
        (l for l in loans if l.status in {LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE}),
        None,
    )

    product_stmt = select(LoanProduct).where(LoanProduct.is_active == True).limit(1)
    product = (await db.execute(product_stmt)).scalar_one_or_none()
    limit_amount = product.max_amount if product else 0

    due_in_days = None
    if active_loan and active_loan.due_date:
        due_in_days = max((active_loan.due_date - date.today()).days, 0)

    return success_response(
        data={
            "active_loan": {
                "id": str(active_loan.id),
                "principal": active_loan.principal,
                "balance": active_loan.outstanding_balance,
                "total_repayable": active_loan.total_due,
                "due_date": active_loan.due_date.isoformat() if active_loan.due_date else None,
                "status": active_loan.status.value.upper(),
                "due_in_days": due_in_days,
            }
            if active_loan
            else None,
            "limit": limit_amount,
            "news": [
                {"title": "Stay in good standing", "body": "On-time payments increase your available credit limit."}
            ],
        }
    )
