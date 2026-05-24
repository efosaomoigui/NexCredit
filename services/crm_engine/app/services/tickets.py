"""
services/crm_engine/app/services/tickets.py
-------------------------------------------
Business logic for managing customer support tickets.
"""
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from shared.models import SupportTicket, TicketStatus, User, TicketMessage

class TicketService:
    @staticmethod
    async def create_ticket(
        session: AsyncSession,
        user_id: uuid.UUID,
        subject: str,
        category: str,
        description: str
    ) -> SupportTicket:
        ticket = SupportTicket(
            user_id=user_id,
            subject=subject,
            category=category,
            status=TicketStatus.OPEN
        )
        session.add(ticket)
        await session.flush()
        
        # Add initial message
        msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=user_id,
            message=description,
            is_internal=False
        )
        session.add(msg)
        await session.commit()
        await session.refresh(ticket)
        return ticket

    @staticmethod
    async def get_user_tickets(session: AsyncSession, user_id: uuid.UUID) -> List[SupportTicket]:
        stmt = select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.created_at.desc())
        res = await session.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def get_all_tickets(session: AsyncSession, status: Optional[str] = None) -> List[SupportTicket]:
        stmt = select(SupportTicket).order_by(SupportTicket.created_at.desc())
        if status:
            stmt = stmt.where(SupportTicket.status == status)
        res = await session.execute(stmt)
        return res.scalars().all()

    @staticmethod
    async def add_reply(
        session: AsyncSession,
        ticket_id: uuid.UUID,
        sender_id: uuid.UUID,
        message: str,
        is_internal: bool = False
    ) -> TicketMessage:
        msg = TicketMessage(
            ticket_id=ticket_id,
            sender_id=sender_id,
            message=message,
            is_internal=is_internal
        )
        session.add(msg)
        
        # If user replied to resolved ticket, maybe reopen it
        if not is_internal:
            stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
            res = await session.execute(stmt)
            ticket = res.scalar_one_or_none()
            if ticket and ticket.status == TicketStatus.RESOLVED:
                ticket.status = TicketStatus.OPEN
                
        await session.commit()
        await session.refresh(msg)
        return msg

    @staticmethod
    async def assign_ticket(session: AsyncSession, ticket_id: uuid.UUID, agent_id: uuid.UUID) -> Optional[SupportTicket]:
        stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
        res = await session.execute(stmt)
        ticket = res.scalar_one_or_none()
        if ticket:
            ticket.assigned_to = agent_id
            ticket.status = TicketStatus.IN_PROGRESS
            await session.commit()
            await session.refresh(ticket)
        return ticket
        
    @staticmethod
    async def resolve_ticket(session: AsyncSession, ticket_id: uuid.UUID) -> Optional[SupportTicket]:
        stmt = select(SupportTicket).where(SupportTicket.id == ticket_id)
        res = await session.execute(stmt)
        ticket = res.scalar_one_or_none()
        if ticket:
            ticket.status = TicketStatus.RESOLVED
            ticket.resolved_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
            await session.commit()
            await session.refresh(ticket)
        return ticket
