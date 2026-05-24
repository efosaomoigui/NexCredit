"""
services/compliance_engine/app/api/v1/routes/audit.py
-----------------------------------------------------
Audit log endpoints for compliance review.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from shared.database import get_db
from shared.models import User, AuditLog, UserRole
from shared.auth.deps import get_current_admin
from shared.response import success_response

router = APIRouter(prefix="/admin/audit", tags=["Compliance Audit"])

@router.get("")
async def list_audit_logs(
    limit: int = 100,
    offset: int = 0,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Fetch system audit logs. Restricted to SuperAdmin and Compliance Officers (Admin).
    """
    if admin.role not in [UserRole.SUPERADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Insufficient privileges to view audit logs")
        
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action == action)
        
    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    
    return success_response(data=logs)
