"""
services/collections_engine/app/services/collections.py
-------------------------------------------------------
Collections logic: notes, PTP, and overdue listing.
"""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from shared.models import (
    Loan, LoanStatus, CollectionNote, PromiseToPay, 
    RepaymentSchedule, PtpStatus
)

class CollectionsService:
    @staticmethod
    async def get_overdue_loans(session: AsyncSession, sort_by: str = "overdue_days"):
        """
        List overdue loans with prioritization.
        """
        stmt = select(Loan).where(Loan.status == LoanStatus.OVERDUE)
        if sort_by == "amount":
            stmt = stmt.order_by(desc(Loan.outstanding_balance))
        else:
            stmt = stmt.order_by(desc(Loan.days_overdue))
            
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def log_note(
        session: AsyncSession, 
        loan_id: uuid.UUID, 
        agent_id: uuid.UUID, 
        text: str, 
        action: Optional[str] = None
    ):
        note = CollectionNote(
            loan_id=loan_id,
            agent_id=agent_id,
            note_text=text,
            action_taken=action
        )
        session.add(note)
        await session.commit()
        return note

    @staticmethod
    async def record_ptp(
        session: AsyncSession,
        loan_id: uuid.UUID,
        borrower_id: uuid.UUID,
        agent_id: uuid.UUID,
        date: __import__("datetime").date,
        amount: int,
        notes: str
    ):
        ptp = PromiseToPay(
            loan_id=loan_id,
            borrower_id=borrower_id,
            recorded_by=agent_id,
            promised_date=date,
            promised_amount=amount,
            notes=notes,
            status=PtpStatus.PENDING
        )
        session.add(ptp)
        await session.commit()
        return ptp

    @staticmethod
    async def apply_penalty(session: AsyncSession, loan_id: uuid.UUID):
        """
        Applies a daily penalty to an overdue loan (e.g., 1% of outstanding balance or flat fee).
        """
        from shared.models import Penalty
        stmt = select(Loan).where(Loan.id == loan_id, Loan.status == LoanStatus.OVERDUE)
        res = await session.execute(stmt)
        loan = res.scalar_one_or_none()
        
        if not loan:
            return None
            
        # Example penalty logic: Flat ₦500 daily fee
        penalty_amount = 500
        
        # Check if penalty already applied today
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).date()
        
        from sqlalchemy import cast, Date
        stmt = select(Penalty).where(
            Penalty.loan_id == loan.id,
            cast(Penalty.applied_at, Date) == today
        )
        res = await session.execute(stmt)
        if res.scalar_one_or_none():
            return None # Already penalized today
            
        penalty = Penalty(
            loan_id=loan.id,
            reason="Daily overdue penalty",
            amount=penalty_amount
        )
        session.add(penalty)
        
        loan.fees += penalty_amount
        loan.total_due += penalty_amount
        loan.outstanding_balance += penalty_amount
        
        return penalty
