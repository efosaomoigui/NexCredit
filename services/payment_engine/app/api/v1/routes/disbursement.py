"""
services/payment_engine/app/api/v1/routes/disbursement.py
---------------------------------------------------------
Admin endpoint to trigger loan disbursement.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import logging

from shared.database import get_db
from shared.models import (
    User, Loan, BankAccount, Disbursement, DisbursementStatus, LoanStatus,
    LoanApplication, LoanApplicationStatus, AuditLog, UserRole
)
from shared.auth.deps import get_current_admin, get_current_user
from shared.response import success_response, error_response
from shared.integrations.factory import IntegrationFactory
from services.payment_engine.app.core.config import settings

router = APIRouter(tags=["Disbursement"])
logger = logging.getLogger(__name__)

async def _disburse_loan(
    loan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User | None = None,
):
    """
    Triggers disbursement for a loan using Stellas API, falling back to Flutterwave.
    """
    # 1. Fetch Loan
    stmt = select(Loan).where(Loan.id == loan_id)
    res = await db.execute(stmt)
    loan = res.scalar_one_or_none()
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    if loan.status != LoanStatus.ACTIVE:
        # Note: Depending on your state machine, it might be DISBURSE_PENDING here. 
        # But our app sets the loan to ACTIVE at creation and application to DISBURSE_PENDING.
        # We'll also check the application status.
        pass

    stmt = select(LoanApplication).where(LoanApplication.id == loan.application_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app or app.status != LoanApplicationStatus.DISBURSE_PENDING:
        return error_response(message="Loan application is not pending disbursement.", status_code=400)
        
    # 2. Get Primary Bank Account
    stmt = select(BankAccount).where(BankAccount.user_id == loan.user_id, BankAccount.is_primary == True)
    res = await db.execute(stmt)
    bank_account = res.scalar_one_or_none()
    
    if not bank_account:
        return error_response(message="Borrower has no verified primary bank account.", status_code=400)
        
    # 3. Check for existing successful disbursement
    stmt = select(Disbursement).where(Disbursement.loan_id == loan.id, Disbursement.status == DisbursementStatus.SUCCESS)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return error_response(message="Loan has already been disbursed.", status_code=400)

    # 4. Create Disbursement Record
    ref = f"DISB-{loan.id}-{uuid.uuid4().hex[:6].upper()}"
    disbursement = Disbursement(
        loan_id=loan.id,
        amount=loan.principal,
        destination_account_id=bank_account.id,
        provider="stellas",
        reference=ref,
        status=DisbursementStatus.INITIATED,
        initiated_by=actor.id if actor else None
    )
    db.add(disbursement)
    await db.commit()
    await db.refresh(disbursement)

    # 5. Call Stellas with Flutterwave fallback
    try:
        stellas = IntegrationFactory.get_stellas()
        resp = await stellas.initiate_transfer(
            amount=loan.principal,
            account_number=bank_account.account_number,
            bank_code=bank_account.bank_code,
            narration=f"NexCredit Loan Disbursement {loan.id}",
            reference=ref
        )
        disbursement.status = DisbursementStatus.SUCCESS
        disbursement.provider_response = resp
    except Exception as e:
        logger.warning(f"Stellas disbursement failed for {loan.id}: {str(e)}. Falling back to Flutterwave.")
        disbursement.provider = "flutterwave"
        try:
            fw = IntegrationFactory.get_flutterwave()
            resp = await fw.initiate_transfer(
                amount=loan.principal,
                account_number=bank_account.account_number,
                bank_code=bank_account.bank_code,
                narration=f"NexCredit Loan Disbursement {loan.id}",
                reference=ref
            )
            disbursement.status = DisbursementStatus.SUCCESS
            disbursement.provider_response = resp
        except Exception as fallback_e:
            logger.error(f"Flutterwave fallback failed: {str(fallback_e)}")
            if settings.SIMULATE_DISBURSEMENT_ON_FAILURE:
                simulated = True
                disbursement.status = DisbursementStatus.SUCCESS
                disbursement.provider = "simulated"
                disbursement.provider_response = {
                    "status": "simulated_success",
                    "reason": "Provider disbursement failed in test mode",
                    "provider_errors": str(fallback_e),
                }
            else:
                disbursement.status = DisbursementStatus.FAILED
                disbursement.provider_response = {"error": str(fallback_e)}
            
    # Update state if successful
    from datetime import datetime, timezone
    if disbursement.status == DisbursementStatus.SUCCESS:
        loan.disbursed_at = datetime.now(timezone.utc)
        app.status = LoanApplicationStatus.DISBURSED
        
        audit = AuditLog(
            actor_id=actor.id if actor else None,
            actor_type="admin" if actor and actor.role in {UserRole.ADMIN, UserRole.SUPERADMIN} else "user",
            action="loan.disbursed",
            entity_type="loans",
            entity_id=loan.id,
            notes=f"Disbursed {loan.principal} via {disbursement.provider}{' (simulated)' if simulated else ''}"
        )
        db.add(audit)
        
    await db.commit()
    
    if disbursement.status == DisbursementStatus.FAILED:
        return error_response(code="DISBURSEMENT_FAILED", message="Disbursement failed across all providers.", status_code=502)
        
    return success_response(
        message="Disbursement successful." if not simulated else "Disbursement simulated successfully.",
        data={"reference": ref, "simulated": simulated, "provider": disbursement.provider},
    )


@router.post("/admin/disburse/{loan_id}")
async def disburse_loan_admin(
    loan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return await _disburse_loan(loan_id=loan_id, db=db, actor=admin)


@router.post("/disburse/{loan_id}")
async def disburse_loan_borrower(
    loan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Loan).where(Loan.id == loan_id, Loan.user_id == user.id)
    res = await db.execute(stmt)
    if not res.scalar_one_or_none():
        return error_response(code="LOAN_NOT_FOUND", message="Loan not found for current user.", status_code=404)
    return await _disburse_loan(loan_id=loan_id, db=db, actor=user)
    simulated = False
