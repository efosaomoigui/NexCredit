"""
services/payment_engine/app/services/disbursement.py
----------------------------------------------------
Disbursement execution via Flutterwave.
"""
import os
import uuid
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import Loan, Disbursement, DisbursementStatus, BankAccount, LoanApplicationStatus
from shared.response import error_response

logger = logging.getLogger(__name__)

class DisbursementService:
    @staticmethod
    async def execute_disbursement(session: AsyncSession, loan_id: uuid.UUID) -> bool:
        """
        Executes a loan disbursement.
        """
        # 1. Fetch Loan and Application
        stmt = select(Loan).where(Loan.id == loan_id)
        result = await session.execute(stmt)
        loan = result.scalar_one_or_none()
        
        if not loan:
            logger.error(f"Loan {loan_id} not found for disbursement")
            return False
            
        # 2. Capacity Check
        pool_ceiling = int(os.getenv("LENDING_POOL_CEILING", "10000000")) # 10M default
        stmt = select(func.sum(Loan.principal)).where(Loan.status == "active")
        res = await session.execute(stmt)
        total_active = res.scalar() or 0
        
        if total_active + loan.principal > pool_ceiling:
            logger.warning(f"Lending pool ceiling breached. Disbursement for loan {loan_id} halted.")
            return False
            
        # 3. Fetch Destination Bank Account
        stmt = select(BankAccount).where(BankAccount.user_id == loan.user_id, BankAccount.verified == True, BankAccount.is_primary == True)
        res = await session.execute(stmt)
        account = res.scalar_one_or_none()
        
        if not account:
            logger.error(f"No verified primary account found for user {loan.user_id}")
            return False
            
        # 4. Mock Flutterwave Transfer Call
        # In production: call Flutterwave API
        reference = f"DISB-{loan_id}-{uuid.uuid4().hex[:8]}"
        
        # 5. Create Disbursement Record
        disbursement = Disbursement(
            loan_id=loan.id,
            amount=loan.principal,
            destination_account_id=account.id,
            provider="flutterwave",
            reference=reference,
            status=DisbursementStatus.INITIATED
        )
        session.add(disbursement)
        
        # Note: Status update to active happens on webhook confirmation
        # but for Phase 1 simulation, we might assume success.
        
        await session.commit()
        logger.info(f"Disbursement initiated for loan {loan_id} with ref {reference}")
        return True
