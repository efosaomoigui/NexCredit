"""
services/payment_engine/app/api/v1/routes/repayments.py
------------------------------------------------------
Borrower repayment initiation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import time
from pydantic import BaseModel, Field

from shared.database import get_db
from shared.models import User, Loan
from shared.auth.deps import get_current_user
from shared.response import success_response
from shared.integrations.base import IntegrationError
from services.payment_engine.app.core.config import settings

router = APIRouter(prefix="/repayments", tags=["Repayments"])

class RepaymentInitiationRequest(BaseModel):
    loan_id: uuid.UUID
    amount: int = Field(..., gt=0)
    payment_method: str = "bank_transfer"


@router.post("/initiate")
async def initiate_repayment(
    payload: RepaymentInitiationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Generate a Paystack payment link for the borrower.
    """
    stmt = select(Loan).where(Loan.id == payload.loan_id, Loan.user_id == user.id)
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    amount = min(payload.amount, loan.outstanding_balance)
        
    reference = f"REPAY-{loan.id}-{int(time.time())}"

    from shared.integrations.factory import IntegrationFactory
    paystack = IntegrationFactory.get_paystack()
    callback_url = settings.PAYSTACK_CALLBACK_URL
    try:
        paystack_url = await paystack.create_payment_link(
            amount=amount,
            reference=reference,
            callback_url=callback_url,
        )
        return success_response(data={
            "payment_url": paystack_url,
            "reference": reference,
            "amount": amount,
            "payment_method": payload.payment_method,
            "mode": "provider_link",
        })
    except IntegrationError:
        # Fallback-safe contract for Sprint 2: keep repayment flow alive when provider is unavailable.
        return success_response(
            message="Repayment request received. Complete transfer using reference.",
            data={
                "payment_url": None,
                "reference": reference,
                "amount": amount,
                "payment_method": payload.payment_method,
                "mode": "manual_fallback",
            },
        )
