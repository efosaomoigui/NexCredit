"""
services/notification_engine/app/services/notifier.py
-----------------------------------------------------
Core notification logic with template rendering and provider routing.
"""
import uuid
import logging
from typing import Any, Optional
from jinja2 import Template
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as redis

from shared.models import Notification, NotificationChannel, NotificationStatus, User
from shared.database import get_db

logger = logging.getLogger(__name__)

# Mock Templates (In production, these would be in the DB)
TEMPLATES = {
    "REPAY_D_MINUS_3": "Your loan of ₦{{amount_due}} is due in 3 days. Pay here: {{payment_link}}",
    "REPAY_D_MINUS_1": "Your loan of ₦{{amount_due}} is due tomorrow. Pay now: {{payment_link}}",
    "REPAY_D_DAY": "Your loan of ₦{{amount_due}} is due today. Pay now to avoid penalties: {{payment_link}}",
    "REPAY_D_PLUS_1": "Your loan of ₦{{amount_due}} was due yesterday. A penalty has been applied. Pay now: {{payment_link}}",
    "OTP_AUTH": "Your OTP is {{otp}}. Valid for 10 minutes."
}

class NotifierService:
    @staticmethod
    async def send_notification(
        session: AsyncSession,
        user_id: uuid.UUID,
        template_id: str,
        channel: NotificationChannel,
        context_vars: dict[str, Any],
        loan_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Renders and sends a notification.
        Enforces FCCPC limit: max 3 SMS per day.
        """
        # 1. Check FCCPC SMS Limit (3 per day)
        if channel == NotificationChannel.SMS:
            r = redis.Redis(host='localhost', port=6379, decode_responses=True)
            import datetime
            today_key = f"sms_count:{user_id}:{datetime.date.today()}"
            count = await r.incr(today_key)
            if count == 1:
                await r.expire(today_key, 86400)
            if count > 3:
                logger.warning(f"FCCPC Limit Breach: Blocked SMS to {user_id}")
                return False

        # 2. Render Template
        raw_template = TEMPLATES.get(template_id)
        if not raw_template:
            logger.error(f"Template {template_id} not found")
            return False
            
        template = Template(raw_template)
        content = template.render(**context_vars)
        
        # 3. Create Record
        notification = Notification(
            user_id=user_id,
            channel=channel,
            template_id=template_id,
            content=content,
            status=NotificationStatus.SENT,
            loan_id=loan_id,
            context_data=context_vars,
            sent_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        )
        session.add(notification)
        
        # 4. Provider Routing
        if channel == NotificationChannel.SMS:
            from shared.integrations.factory import IntegrationFactory
            # Get user's phone number
            stmt = select(User).where(User.id == user_id)
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            if user and user.phone:
                try:
                    termii = IntegrationFactory.get_termii()
                    await termii.send_sms(to=user.phone, text=content)
                    notification.status = NotificationStatus.SENT
                    logger.info(f"Termii SMS sent to {user.phone}: {content}")
                except Exception as e:
                    logger.error(f"Termii SMS failed for user {user_id}: {e}")
                    notification.status = NotificationStatus.FAILED
            else:
                logger.error(f"Cannot send SMS to user {user_id}: No phone number")
                notification.status = NotificationStatus.FAILED
        elif channel == NotificationChannel.EMAIL:
            from shared.integrations.factory import IntegrationFactory
            # Get user's email
            stmt = select(User).where(User.id == user_id)
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            
            if user and user.email:
                try:
                    email_client = IntegrationFactory.get_email()
                    await email_client.send_email(
                        to=user.email,
                        subject="NexCredit Notification" if template_id != "OTP_AUTH" else "Your Verification Code",
                        body=content
                    )
                    notification.status = NotificationStatus.SENT
                    logger.info(f"Email sent to {user.email}: {content}")
                except Exception as e:
                    logger.error(f"Email failed for user {user_id}: {e}")
                    notification.status = NotificationStatus.FAILED
            else:
                logger.error(f"Cannot send Email to user {user_id}: No email address")
                notification.status = NotificationStatus.FAILED
        else:
            # WhatsApp or other (Mocked)
            logger.info(f"Notification [{channel}] sent to {user_id}: {content}")
        
        await session.commit()
        return notification.status == NotificationStatus.SENT
