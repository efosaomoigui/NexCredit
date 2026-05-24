"""
services/collections_engine/app/tasks.py
----------------------------------------
Celery tasks for collections engine.
"""
import uuid
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date

from shared.queue.tasks import celery_app
from shared.database import async_session_maker
from shared.models import Loan, LoanStatus, RepaymentSchedule, ScheduleStatus

@celery_app.task(name="collections.detect_overdue")
def detect_overdue():
    asyncio.run(_detect_overdue_async())

async def _detect_overdue_async():
    async with async_session_maker() as session:
        # Find loans that are ACTIVE or PARTIALLY_REPAID and have a schedule due before today and not PAID
        today = date.today()
        stmt = select(Loan).join(RepaymentSchedule).where(
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID]),
            RepaymentSchedule.due_date < today,
            RepaymentSchedule.status.in_([ScheduleStatus.PENDING])
        )
        res = await session.execute(stmt)
        overdue_loans = res.scalars().unique().all()
        
        for loan in overdue_loans:
            loan.status = LoanStatus.OVERDUE
            # calculate days overdue
            # Find earliest pending schedule
            sch_stmt = select(RepaymentSchedule).where(
                RepaymentSchedule.loan_id == loan.id,
                RepaymentSchedule.status == ScheduleStatus.PENDING
            ).order_by(RepaymentSchedule.due_date.asc()).limit(1)
            sch_res = await session.execute(sch_stmt)
            oldest_sch = sch_res.scalar_one_or_none()
            if oldest_sch:
                loan.days_overdue = (today - oldest_sch.due_date).days
        
        await session.commit()

@celery_app.task(name="collections.apply_penalties")
def apply_penalties():
    asyncio.run(_apply_penalties_async())

async def _apply_penalties_async():
    from services.collections_engine.app.services.collections import CollectionsService
    async with async_session_maker() as session:
        stmt = select(Loan).where(Loan.status == LoanStatus.OVERDUE, Loan.days_overdue > 0)
        res = await session.execute(stmt)
        overdue_loans = res.scalars().all()
        for loan in overdue_loans:
            await CollectionsService.apply_penalty(session, loan.id)
        await session.commit()

@celery_app.task(name="collections.escalate_overdue")
def escalate_overdue():
    asyncio.run(_escalate_overdue_async())

async def _escalate_overdue_async():
    from services.collections_engine.app.services.escalation import EscalationService
    async with async_session_maker() as session:
        stmt = select(Loan).where(Loan.status == LoanStatus.OVERDUE)
        res = await session.execute(stmt)
        loans = res.scalars().all()
        for loan in loans:
            await EscalationService.update_escalation_tier(session, loan.id)
        await session.commit()
