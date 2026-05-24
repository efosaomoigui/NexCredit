"""
services/payment_engine/app/api/v1/routes/webhooks.py
-----------------------------------------------------
Webhooks for Paystack, Flutterwave, and Monnify.
"""
from fastapi import APIRouter, Header, Request, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hmac
import hashlib
import json
import logging
import os

from shared.database import get_db
from shared.models import (
    Repayment, Loan, RepaymentSchedule, ScheduleStatus, 
    LoanStatus, Disbursement, DisbursementStatus
)
from shared.response import success_response

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)

# Secret keys from config
from services.payment_engine.app.core.config import settings
PAYSTACK_SECRET = settings.PAYSTACK_SECRET_KEY or os.getenv("PAYSTACK_SECRET_KEY", "")
STELLAS_SECRET = settings.STELLAS_SECRET_KEY or os.getenv("STELLAS_SECRET_KEY", "")
FLW_SECRET = settings.FLUTTERWAVE_WEBHOOK_SECRET or os.getenv("FLUTTERWAVE_WEBHOOK_SECRET", "")

@router.post("/paystack")
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    body = await request.body()
    # Verify signature
    from shared.integrations.factory import IntegrationFactory
    if os.getenv("USE_MOCK_PROVIDERS") != "true":
        try:
            paystack = IntegrationFactory.get_paystack()
            paystack.verify_webhook(body.decode(), x_paystack_signature)
        except Exception as e:
            logger.error(f"Paystack webhook verification failed: {e}")
            return {"status": "verification_failed"}
    
    payload = json.loads(body)
    if payload.get("event") != "charge.success":
        return {"status": "ignored"}
        
    data = payload["data"]
    reference = data["reference"]
    
    # 1. Idempotency Check
    stmt = select(Repayment).where(Repayment.payment_reference == reference)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return {"status": "already_processed"}
        
    # 2. Extract Metadata
    # Assume reference format: REPAY-{loan_id}-{ts}
    try:
        if not reference.startswith("REPAY-"):
            return {"status": "invalid_reference"}
        # Format: REPAY-{loan_id}-{timestamp}
        body_ref = reference[len("REPAY-"):]
        loan_id, _ts = body_ref.rsplit("-", 1)
        amount_paid = data["amount"] / 100 # Kobo to Naira
    except Exception:
        return {"status": "invalid_reference"}
        
    # 3. Process Repayment
    stmt = select(Loan).where(Loan.id == loan_id)
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    
    if not loan:
        return {"status": "loan_not_found"}
        
    repayment = Repayment(
        loan_id=loan.id,
        amount_paid=int(amount_paid),
        paid_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        channel="paystack",
        payment_reference=reference,
        provider_response=data
    )
    db.add(repayment)
    
    # 4. Update Schedules and Loan Status
    loan.amount_repaid += int(amount_paid)
    loan.outstanding_balance -= int(amount_paid)
    
    # Match to schedule (Simplified: pay oldest pending)
    stmt = select(RepaymentSchedule).where(
        RepaymentSchedule.loan_id == loan.id,
        RepaymentSchedule.status == ScheduleStatus.PENDING
    ).order_by(RepaymentSchedule.installment_no.asc())
    res = await db.execute(stmt)
    schedules = res.scalars().all()
    
    remaining = int(amount_paid)
    for sch in schedules:
        if remaining <= 0: break
        due = sch.amount_due - sch.amount_paid
        pay = min(remaining, due)
        sch.amount_paid += pay
        remaining -= pay
        if sch.amount_paid >= sch.amount_due:
            sch.status = ScheduleStatus.PAID
            sch.paid_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
            
    # Check if fully repaid
    if loan.outstanding_balance <= 0:
        loan.status = LoanStatus.FULLY_REPAID
    else:
        loan.status = LoanStatus.PARTIALLY_REPAID
        
    await db.commit()
    return {"status": "success"}

@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    verif_hash: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if os.getenv("USE_MOCK_PROVIDERS") != "true":
        if not FLW_SECRET or not verif_hash or verif_hash != FLW_SECRET:
            logger.error("Flutterwave webhook verification failed.")
            return {"status": "verification_failed"}

    payload = await request.json()
    data = payload.get("data", {})
    event = payload.get("event")
    
    reference = data.get("reference")
    stmt = select(Disbursement).where(Disbursement.reference == reference)
    res = await db.execute(stmt)
    disbursement = res.scalar_one_or_none()
    
    if not disbursement:
        return {"status": "not_found"}
        
    if event == "transfer.completed":
        disbursement.status = DisbursementStatus.SUCCESS
        disbursement.disbursed_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        
        # Update Loan to active
        stmt = select(Loan).where(Loan.id == disbursement.loan_id)
        res = await db.execute(stmt)
        loan = res.scalar_one_or_none()
        if loan:
            loan.status = LoanStatus.ACTIVE
            loan.disbursed_at = disbursement.disbursed_at
            
    elif event == "transfer.failed":
        disbursement.status = DisbursementStatus.FAILED
        # Notify Admin...
        
    await db.commit()
    return {"status": "success"}

@router.post("/stellas")
async def stellas_webhook(
    request: Request,
    x_stellas_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Stellas webhooks, particularly incoming payments to virtual accounts.
    """
    body = await request.body()
    # Example Signature Verification
    if os.getenv("USE_MOCK_PROVIDERS") != "true":
        expected = hmac.new(STELLAS_SECRET.encode(), body, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(expected, x_stellas_signature or ""):
            return {"status": "verification_failed"}
            
    payload = json.loads(body)
    event = payload.get("event")
    
    if event == "virtual_account.payment":
        data = payload.get("data", {})
        account_number = data.get("accountNumber")
        amount_paid = data.get("amount") # Assumed in base unit (Naira)
        reference = data.get("reference")
        
        # 1. Idempotency Check
        stmt = select(Repayment).where(Repayment.payment_reference == reference)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            return {"status": "already_processed"}
            
        # 2. Find Loan by Bank Account
        from shared.models import BankAccount
        stmt = select(BankAccount).where(BankAccount.account_number == account_number)
        res = await db.execute(stmt)
        v_account = res.scalar_one_or_none()
        
        if not v_account:
            return {"status": "account_not_found"}
            
        stmt = select(Loan).where(Loan.user_id == v_account.user_id, Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE]))
        res = await db.execute(stmt)
        loan = res.scalar_one_or_none()
        
        if not loan:
            return {"status": "active_loan_not_found"}
            
        # 3. Process Repayment
        repayment = Repayment(
            loan_id=loan.id,
            amount_paid=int(amount_paid),
            paid_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
            channel="stellas_va",
            payment_reference=reference,
            provider_response=data
        )
        db.add(repayment)
        
        # 4. Update Schedules and Loan Status (similar logic as paystack)
        loan.amount_repaid += int(amount_paid)
        loan.outstanding_balance -= int(amount_paid)
        
        stmt = select(RepaymentSchedule).where(
            RepaymentSchedule.loan_id == loan.id,
            RepaymentSchedule.status == ScheduleStatus.PENDING
        ).order_by(RepaymentSchedule.installment_no.asc())
        res = await db.execute(stmt)
        schedules = res.scalars().all()
        
        remaining = int(amount_paid)
        for sch in schedules:
            if remaining <= 0: break
            due = sch.amount_due - sch.amount_paid
            pay = min(remaining, due)
            sch.amount_paid += pay
            remaining -= pay
            if sch.amount_paid >= sch.amount_due:
                sch.status = ScheduleStatus.PAID
                sch.paid_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
                
        if loan.outstanding_balance <= 0:
            loan.status = LoanStatus.FULLY_REPAID
        else:
            loan.status = LoanStatus.PARTIALLY_REPAID
            
        await db.commit()
        return {"status": "success"}
        
    return {"status": "ignored"}
