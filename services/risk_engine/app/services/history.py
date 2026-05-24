"""
services/risk_engine/app/services/history.py
--------------------------------------------
Scoring based on historical loan performance within NexCredit.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import Loan, LoanStatus

class HistoryService:
    @staticmethod
    async def compute_internal_score(session: AsyncSession, user_id: uuid.UUID) -> float:
        """
        Query historical loans and compute on-time repayment rate.
        First-time borrowers get 50.0.
        """
        stmt = select(Loan).where(Loan.user_id == user_id)
        result = await session.execute(stmt)
        loans = result.scalars().all()
        
        if not loans:
            return 50.0 # Neutral for first-time borrowers
            
        # Check for any active overdue loans - Hard penalty
        overdue_loans = [l for l in loans if l.status == LoanStatus.OVERDUE]
        if overdue_loans:
            return 0.0 # Instant fail if currently overdue
            
        # Compute repayment rate
        # This is a simplification; in production we'd look at installment_level
        total_loans = len(loans)
        fully_repaid = len([l for l in loans if l.status == LoanStatus.FULLY_REPAID])
        
        repayment_rate = (fully_repaid / total_loans) * 100
        return float(repayment_rate)
