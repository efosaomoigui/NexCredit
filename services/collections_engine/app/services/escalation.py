"""
services/collections_engine/app/services/escalation.py
------------------------------------------------------
Automated escalation tier assignment.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import Loan, LoanStatus, EscalationLog

class EscalationService:
    @staticmethod
    def calculate_tier(days_overdue: int) -> int:
        if days_overdue <= 7:
            return 1
        elif days_overdue <= 14:
            return 2
        elif days_overdue <= 30:
            return 3
        else:
            return 4

    @staticmethod
    async def update_escalation_tier(session: AsyncSession, loan_id: uuid.UUID):
        """
        Updates the escalation tier for an overdue loan.
        """
        stmt = select(Loan).where(Loan.id == loan_id)
        res = await session.execute(stmt)
        loan = res.scalar_one_or_none()
        
        if not loan or loan.status != LoanStatus.OVERDUE:
            return
            
        new_tier = EscalationService.calculate_tier(loan.days_overdue)
        
        # Log escalation if changed
        stmt = select(EscalationLog).where(EscalationLog.loan_id == loan.id).order_by(EscalationLog.escalated_at.desc()).limit(1)
        res = await session.execute(stmt)
        last_log = res.scalar_one_or_none()
        
        if not last_log or last_log.tier_level != new_tier:
            new_log = EscalationLog(
                loan_id=loan.id,
                tier_level=new_tier,
                reason=f"Auto-escalated due to {loan.days_overdue} days overdue"
            )
            session.add(new_log)
            # You might trigger notifications or re-assignments here based on new_tier
            
        return new_tier
