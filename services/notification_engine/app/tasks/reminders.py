"""
services/notification_engine/app/tasks/reminders.py
---------------------------------------------------
Scheduled reminder tasks for the Notification Engine.
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from shared.database import AsyncSessionLocal
from shared.models import RepaymentSchedule, ScheduleStatus, Loan, NotificationChannel
from services.notification_engine.app.services.notifier import NotifierService

async def schedule_repayment_reminders():
    """
    Daily task to trigger reminders for upcoming due dates (D-3, D-1, D-Day).
    """
    from datetime import date, timedelta
    today = date.today()
    
    targets = [
        (today + timedelta(days=3), "REPAY_D_MINUS_3"),
        (today + timedelta(days=1), "REPAY_D_MINUS_1"),
        (today, "REPAY_D_DAY")
    ]
    
    async with AsyncSessionLocal() as session:
        for due_date, template in targets:
            stmt = select(RepaymentSchedule).where(
                and_(
                    RepaymentSchedule.due_date == due_date,
                    RepaymentSchedule.status == ScheduleStatus.PENDING
                )
            )
            res = await session.execute(stmt)
            schedules = res.scalars().all()
            
            for sch in schedules:
                # Fetch Loan for context
                stmt = select(Loan).where(Loan.id == sch.loan_id)
                l_res = await session.execute(stmt)
                loan = l_res.scalar_one_or_none()
                
                if loan:
                    await NotifierService.send_notification(
                        session=session,
                        user_id=loan.user_id,
                        template_id=template,
                        channel=NotificationChannel.SMS,
                        context_vars={
                            "amount_due": sch.amount_due,
                            "due_date": str(sch.due_date),
                            "payment_link": f"https://repay.nexcredit.ng/{loan.id}"
                        },
                        loan_id=loan.id
                    )
        await session.commit()
