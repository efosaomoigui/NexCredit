"""
services/notification_engine/app/tasks.py
-----------------------------------------
Celery tasks for Notification Engine.
"""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date, timedelta

from shared.queue.tasks import celery_app
from shared.database import async_session_maker
from shared.models import Loan, LoanStatus, RepaymentSchedule, ScheduleStatus, NotificationChannel
from services.notification_engine.app.services.notifier import NotifierService

logger = logging.getLogger(__name__)

@celery_app.task(name="notifications.send_daily_reminders")
def send_daily_reminders():
    asyncio.run(_send_daily_reminders_async())

async def _send_daily_reminders_async():
    async with async_session_maker() as session:
        today = date.today()
        # Due in 3 days
        d3 = today + timedelta(days=3)
        # Due tomorrow
        d1 = today + timedelta(days=1)
        # Due yesterday
        d_minus_1 = today - timedelta(days=1)
        
        # 1. D-3 Reminders
        stmt = select(Loan, RepaymentSchedule).join(RepaymentSchedule).where(
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID]),
            RepaymentSchedule.due_date == d3,
            RepaymentSchedule.status == ScheduleStatus.PENDING
        )
        for loan, sch in (await session.execute(stmt)).all():
            await _dispatch(session, loan.user_id, "REPAY_D_MINUS_3", sch, loan.id)

        # 2. D-1 Reminders
        stmt = select(Loan, RepaymentSchedule).join(RepaymentSchedule).where(
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID]),
            RepaymentSchedule.due_date == d1,
            RepaymentSchedule.status == ScheduleStatus.PENDING
        )
        for loan, sch in (await session.execute(stmt)).all():
            await _dispatch(session, loan.user_id, "REPAY_D_MINUS_1", sch, loan.id)

        # 3. D-0 Reminders
        stmt = select(Loan, RepaymentSchedule).join(RepaymentSchedule).where(
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID]),
            RepaymentSchedule.due_date == today,
            RepaymentSchedule.status == ScheduleStatus.PENDING
        )
        for loan, sch in (await session.execute(stmt)).all():
            await _dispatch(session, loan.user_id, "REPAY_D_DAY", sch, loan.id)

        # 4. D+1 Overdue Penalty Reminders
        stmt = select(Loan, RepaymentSchedule).join(RepaymentSchedule).where(
            Loan.status == LoanStatus.OVERDUE,
            RepaymentSchedule.due_date == d_minus_1,
            RepaymentSchedule.status == ScheduleStatus.PENDING
        )
        for loan, sch in (await session.execute(stmt)).all():
            await _dispatch(session, loan.user_id, "REPAY_D_PLUS_1", sch, loan.id)
            
        await session.commit()

async def _dispatch(session, user_id, template, sch, loan_id):
    link = f"https://nexcredit.ng/repay/{loan_id}"
    context = {"amount_due": f"{sch.amount_due:,}", "payment_link": link}
    await NotifierService.send_notification(session, user_id, template, NotificationChannel.SMS, context, loan_id)
