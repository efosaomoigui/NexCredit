"""
services/payment_engine/app/tasks/penalties.py
----------------------------------------------
Automated penalty application for overdue loans.
"""
import os
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from shared.database import AsyncSessionLocal
from shared.models import RepaymentSchedule, ScheduleStatus, Loan, LoanStatus, Penalty

async def apply_overdue_penalties():
    """
    Daily task to apply penalties to overdue schedules.
    """
    daily_rate = float(os.getenv("DAILY_PENALTY_RATE", "0.01")) # 1% default
    
    async with AsyncSessionLocal() as session:
        # 1. Find all pending schedules past due date
        today = __import__("datetime").date.today()
        stmt = select(RepaymentSchedule).where(
            and_(
                RepaymentSchedule.due_date < today,
                RepaymentSchedule.status == ScheduleStatus.PENDING
            )
        )
        result = await session.execute(stmt)
        schedules = result.scalars().all()
        
        for sch in schedules:
            # 2. Fetch Loan
            stmt = select(Loan).where(Loan.id == sch.loan_id)
            res = await session.execute(stmt)
            loan = res.scalar_one_or_none()
            
            if not loan or loan.status == LoanStatus.WRITTEN_OFF:
                continue
                
            # 3. Compute Penalty
            penalty_amount = int(sch.amount_due * daily_rate)
            
            # 4. Record Penalty
            penalty = Penalty(
                loan_id=loan.id,
                reason=f"Daily overdue penalty for installment {sch.installment_no}",
                amount=penalty_amount,
                applied_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc)
            )
            session.add(penalty)
            
            # 5. Update Loan Totals
            loan.total_due += penalty_amount
            loan.outstanding_balance += penalty_amount
            loan.status = LoanStatus.OVERDUE
            loan.days_overdue = (today - sch.due_date).days
            
            # Update schedule status if this is the first time
            sch.status = ScheduleStatus.OVERDUE
            
        await session.commit()
