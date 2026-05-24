"""
services/identity_engine/app/core/notifications.py
--------------------------------------------------
Notification service for sending OTPs.
"""
import logging
from shared.integrations.factory import IntegrationFactory

logger = logging.getLogger(__name__)

async def send_otp_sms(phone: str, otp: str):
    """
    Send OTP via Termii SMS.
    """
    termii = IntegrationFactory.get_termii()
    message = f"Your NexCredit verification code is {otp}. It expires in 10 minutes."
    try:
        await termii.send_sms(phone, message)
        logger.info("OTP successfully sent via Termii (phone hidden for privacy)")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP via Termii: {str(e)}")
        return False

async def send_otp_whatsapp(phone: str, otp: str):
    """
    Send OTP via Termii WhatsApp.
    """
    termii = IntegrationFactory.get_termii()
    message = f"Your NexCredit verification code is {otp}. It expires in 10 minutes."
    try:
        if hasattr(termii, 'send_whatsapp'):
            await termii.send_whatsapp(phone, message)
        else:
            # Fallback if method doesn't exist on mock
            await termii.send_sms(phone, message)
        logger.info("OTP successfully sent via Termii WhatsApp")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP via Termii WhatsApp: {str(e)}")
        return False

async def send_otp_email(email: str, otp: str):
    """
    Send OTP via SMTP/Email.
    """
    try:
        email_client = IntegrationFactory.get_email()
        subject = "NexCredit Verification Code"
        message = f"Your NexCredit verification code is {otp}. It expires in 10 minutes."
        await email_client.send_email(email, subject, message)
        logger.info(f"OTP successfully sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP via Email: {str(e)}")
        return False
