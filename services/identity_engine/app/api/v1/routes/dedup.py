"""
services/identity_engine/app/api/v1/routes/dedup.py
---------------------------------------------------
Internal deduplication endpoints and logic.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from shared.database import get_db
from shared.models import KycRecord
from shared.response import success_response, error_response

router = APIRouter(prefix="/dedup", tags=["Deduplication"])

@router.get("/check-bvn")
async def check_bvn_duplicate(
    bvn_hash: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a BVN hash is already linked to a different account.
    This is an internal check used by other engines or during registration.
    """
    stmt = select(KycRecord).where(KycRecord.bvn_hash == bvn_hash)
    result = await db.execute(stmt)
    kyc = result.scalar_one_or_none()
    
    if kyc:
        return error_response(message="This BVN is already registered", status_code=409)
        
    return success_response(data={"is_duplicate": False})

@router.get("/check-device")
async def check_device_duplicate(
    device_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a device is linked to too many accounts or flagged.
    """
    # Simple rule-based mock for now
    if device_id.startswith("BANNED-"):
        return error_response(message="This device has been flagged for suspicious activity", status_code=403)
        
    return success_response(data={"is_duplicate": False})
