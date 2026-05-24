"""
services/notification_engine/app/api/v1/routes/notifications.py
---------------------------------------------------------------
Internal API for triggering notifications.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from shared.database import get_db
from shared.models import NotificationChannel, UserRole
from shared.response import success_response
from shared.auth.deps import get_current_user
from services.notification_engine.app.services.notifier import NotifierService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.post("/send")
async def trigger_notification(
    user_id: uuid.UUID,
    template_id: str,
    channel: NotificationChannel,
    context: dict,
    db: AsyncSession = Depends(get_db),
    # Optional dependency: Could secure this to only allow internal services or admins
):
    """
    Triggers a notification to be sent. Intended for internal service-to-service calls.
    """
    success = await NotifierService.send_notification(
        session=db,
        user_id=user_id,
        template_id=template_id,
        channel=channel,
        context_vars=context
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Notification dispatch failed or blocked by rate limit.")
        
    return success_response(message="Notification dispatched successfully.")
