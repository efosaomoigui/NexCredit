"""
shared/integrations/termii/mock.py
----------------------------------
Mock client for Termii.
"""
import logging

logger = logging.getLogger(__name__)

class TermiiMock:
    async def send_sms(self, phone: str, message: str):
        logger.info(f"[MOCK TERMII] Sending SMS to {phone}: {message}")
        return {"message_id": "mock_id_123", "status": "success"}
