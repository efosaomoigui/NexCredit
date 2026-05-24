"""
services/collections_engine/app/api/v1/routes/collections.py
------------------------------------------------------------
API endpoints for collections agents.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import Optional

from shared.database import get_db
from shared.models import User, Role
from shared.auth.deps import get_current_user, require_reviewer
from shared.response import success_response, error_response
from services.collections_engine.app.services.collections import CollectionsService

router = APIRouter(prefix="/collections", tags=["Collections"])

@router.get("/overdue")
async def list_overdue(
    sort: str = "overdue_days",
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(get_current_user)
):
    # Check if agent role or higher
    if agent.role not in ["agent", "reviewer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    loans = await CollectionsService.get_overdue_loans(db, sort_by=sort)
    return success_response(data=loans)

@router.post("/{loan_id}/notes")
async def add_note(
    loan_id: uuid.UUID,
    text: str,
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(get_current_user)
):
    if agent.role not in ["agent", "reviewer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    note = await CollectionsService.log_note(db, loan_id, agent.id, text, action)
    return success_response(data=note)

@router.post("/{loan_id}/promise-to-pay")
async def add_ptp(
    loan_id: uuid.UUID,
    promised_date: str,
    amount: int,
    notes: str,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(get_current_user)
):
    if agent.role not in ["agent", "reviewer", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch borrower_id from loan
    from shared.models import Loan
    from sqlalchemy import select
    res = await db.execute(select(Loan).where(Loan.id == loan_id))
    loan = res.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    from datetime import datetime
    p_date = datetime.strptime(promised_date, "%Y-%m-%d").date()
    
    ptp = await CollectionsService.record_ptp(
        db, loan_id, loan.user_id, agent.id, p_date, amount, notes
    )
    return success_response(data=ptp)
