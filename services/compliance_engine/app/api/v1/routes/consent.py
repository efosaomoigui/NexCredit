"""
services/compliance_engine/app/api/v1/routes/consent.py
-------------------------------------------------------
NDPC consent management for borrowers.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import List

from shared.database import get_db
from shared.models import User, ConsentRecord
from shared.auth.deps import get_current_user
from shared.response import success_response, error_response

router = APIRouter(prefix="/me/consents", tags=["Compliance"])

@router.post("")
async def record_consent(
    consent_type: str,
    granted: bool,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Record explicit consent for a data processing category.
    """
    # Check if existing record
    from sqlalchemy import select
    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user.id,
            ConsentRecord.consent_type == consent_type
        )
    )
    existing = res.scalar_one_or_none()
    
    if existing:
        existing.granted = granted
        if not granted:
            existing.revoked_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    else:
        consent = ConsentRecord(
            user_id=user.id,
            consent_type=consent_type,
            granted=granted,
            ip_address=request.client.host,
            version="v1.0"
        )
        db.add(consent)
    
    await db.commit()
    return success_response(message="Consent recorded successfully")

@router.get("")
async def get_my_consents(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from sqlalchemy import select
    res = await db.execute(select(ConsentRecord).where(ConsentRecord.user_id == user.id))
    consents = res.scalars().all()
    return success_response(data=consents)

@router.post("/{consent_type}/revoke")
async def revoke_consent(
    consent_type: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from sqlalchemy import select
    res = await db.execute(
        select(ConsentRecord).where(
            ConsentRecord.user_id == user.id,
            ConsentRecord.consent_type == consent_type
        )
    )
    consent = res.scalar_one_or_none()
    if not consent:
        raise HTTPException(status_code=404, detail="Consent record not found")
        
    consent.granted = False
    consent.revoked_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    await db.commit()
    
    # Logic to halt processing based on type would trigger here (e.g. background task)
    return success_response(message=f"Consent for {consent_type} revoked")
