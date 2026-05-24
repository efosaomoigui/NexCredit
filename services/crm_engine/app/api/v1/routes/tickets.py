"""
services/crm_engine/app/api/v1/routes/tickets.py
------------------------------------------------
API routes for CRM tickets.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import Optional

from shared.database import get_db
from shared.models import User, UserRole
from shared.auth.deps import get_current_user, get_current_admin
from shared.response import success_response, error_response
from services.crm_engine.app.services.tickets import TicketService

router = APIRouter(prefix="/tickets", tags=["CRM"])

# --- User Endpoints ---

@router.post("")
async def create_ticket(
    subject: str,
    category: str,
    description: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ticket = await TicketService.create_ticket(db, user.id, subject, category, description)
    return success_response(data=ticket)

@router.get("/me")
async def get_my_tickets(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    tickets = await TicketService.get_user_tickets(db, user.id)
    return success_response(data=tickets)

@router.post("/{ticket_id}/reply")
async def user_reply(
    ticket_id: uuid.UUID,
    message: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Verify ownership
    from sqlalchemy import select
    from shared.models import SupportTicket
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id, SupportTicket.user_id == user.id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    msg = await TicketService.add_reply(db, ticket_id, user.id, message, is_internal=False)
    return success_response(data=msg)

# --- Admin Endpoints ---

@router.get("/admin/list")
async def admin_list_tickets(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    tickets = await TicketService.get_all_tickets(db, status)
    return success_response(data=tickets)

@router.post("/admin/{ticket_id}/assign")
async def admin_assign_ticket(
    ticket_id: uuid.UUID,
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    ticket = await TicketService.assign_ticket(db, ticket_id, agent_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return success_response(data=ticket)

@router.post("/admin/{ticket_id}/reply")
async def admin_reply(
    ticket_id: uuid.UUID,
    message: str,
    is_internal: bool = False,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    msg = await TicketService.add_reply(db, ticket_id, admin.id, message, is_internal)
    return success_response(data=msg)

@router.post("/admin/{ticket_id}/resolve")
async def admin_resolve(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    ticket = await TicketService.resolve_ticket(db, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return success_response(data=ticket)
