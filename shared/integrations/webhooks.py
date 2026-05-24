"""
shared/integrations/webhooks.py
-------------------------------
Centralized webhook logging and verification registry.
"""
import json
import logging
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from shared.models import WebhookLog # Assuming this model exists in models/compliance.py
from .base import WebhookVerificationError

logger = logging.getLogger(__name__)

class WebhookRegistry:
    @staticmethod
    async def log_and_verify(
        session: AsyncSession,
        provider: str,
        payload: str,
        signature: str,
        verifier_func: Any
    ):
        """
        Logs the raw webhook and runs signature verification.
        """
        is_valid = False
        try:
            is_valid = verifier_func(payload, signature)
        except WebhookVerificationError:
            logger.warning(f"Webhook signature verification failed for {provider}")
        
        # Log to DB
        # from shared.models.compliance import WebhookLog
        # webhook_log = WebhookLog(
        #     provider=provider,
        #     payload=json.loads(payload),
        #     signature_valid=is_valid,
        #     received_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc)
        # )
        # session.add(webhook_log)
        # await session.commit()
        
        return is_valid
