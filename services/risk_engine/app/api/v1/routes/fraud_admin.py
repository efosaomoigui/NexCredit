"""
services/risk_engine/app/api/v1/routes/fraud_admin.py
-----------------------------------------------------
Admin endpoints for managing fraud flags.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import User, FraudFlag, AuditLog
from shared.response import success_response, error_response
from shared.auth.deps import get_current_admin

router = APIRouter(prefix="/admin/fraud", tags=["Fraud Admin"])

@router.get("/flags")
async def list_fraud_flags(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """All unresolved fraud flags, sortable by severity."""
    stmt = select(FraudFlag).where(FraudFlag.resolved == False).order_by(FraudFlag.severity.desc())
    result = await db.execute(stmt)
    flags = result.scalars().all()
    
    return success_response(data=flags)

@router.post("/flags/{flag_id}/resolve")
async def resolve_fraud_flag(
    flag_id: uuid.UUID,
    reason: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Mark flag as resolved with reason (audit logged)."""
    stmt = select(FraudFlag).where(FraudFlag.id == flag_id)
    result = await db.execute(stmt)
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
        
    flag.resolved = True
    flag.resolved_by = admin.id
    flag.resolved_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    flag.resolution_notes = reason
    
    # Audit Log
    audit = AuditLog(
        actor_id=admin.id,
        actor_type="admin",
        action="fraud.flag_resolved",
        entity_type="fraud_flags",
        entity_id=flag.id,
        notes=reason
    )
    db.add(audit)
    await db.commit()
    
    return success_response(message="Fraud flag resolved successfully")
