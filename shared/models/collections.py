"""
shared/models/collections.py
-----------------------------
ORM models for Collections & Communications.

Tables:
  - notifications     → Outbound message log (SMS, email, WhatsApp, in-app)
  - collection_notes  → Agent interaction notes on overdue loans
  - escalation_logs   → Escalation chain for unresolved overdue accounts
  - promise_to_pay    → Borrower commitment records (PTP tracking)
"""
from __future__ import annotations

import enum as py_enum
import uuid
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import AuditableMixin, Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class NotificationChannel(str, py_enum.Enum):
    SMS       = "sms"
    EMAIL     = "email"
    WHATSAPP  = "whatsapp"
    IN_APP    = "in_app"
    PUSH      = "push"


class NotificationStatus(str, py_enum.Enum):
    QUEUED    = "queued"
    SENT      = "sent"
    DELIVERED = "delivered"
    FAILED    = "failed"
    BOUNCED   = "bounced"


class PtpStatus(str, py_enum.Enum):
    PENDING = "pending"
    KEPT    = "kept"
    BROKEN  = "broken"
    EXPIRED = "expired"


# ---------------------------------------------------------------------------
# notifications
# ---------------------------------------------------------------------------

class Notification(Base, AuditableMixin):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel", create_type=True),
        nullable=False,
    )
    template_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status", create_type=True),
        nullable=False,
        default=NotificationStatus.QUEUED,
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    loan_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    context_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    def __repr__(self) -> str:
        return f"<Notification id={self.id} status={self.status}>"


# ---------------------------------------------------------------------------
# collection_notes
# ---------------------------------------------------------------------------

class CollectionNote(Base, AuditableMixin):
    __tablename__ = "collection_notes"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )
    note_text: Mapped[str] = mapped_column(Text, nullable=False)
    action_taken: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    next_follow_up: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<CollectionNote id={self.id} action={self.action_taken}>"


# ---------------------------------------------------------------------------
# escalation_logs
# ---------------------------------------------------------------------------

class EscalationLog(Base, AuditableMixin):
    __tablename__ = "escalation_logs"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    escalated_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
    )
    escalation_level: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<EscalationLog id={self.id} level={self.escalation_level}>"


# ---------------------------------------------------------------------------
# promise_to_pay
# ---------------------------------------------------------------------------

class PromiseToPay(Base, AuditableMixin):
    __tablename__ = "promise_to_pay"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    borrower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recorded_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    promised_date: Mapped[date] = mapped_column(Date, nullable=False)
    promised_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PtpStatus] = mapped_column(
        Enum(PtpStatus, name="ptp_status", create_type=True),
        nullable=False,
        default=PtpStatus.PENDING,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    broken_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<PromiseToPay id={self.id} status={self.status}>"


# ---------------------------------------------------------------------------
# agent_assignments
# ---------------------------------------------------------------------------

class AgentAssignment(Base, AuditableMixin):
    """
    Links a borrower to a collections agent for follow-up.

    MVP scope: assignment at borrower level. Later, this can be expanded
    to loan-level or case-level ownership.
    """

    __tablename__ = "agent_assignments"

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → users.id (role=agent)",
    )
    borrower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → users.id (role=borrower)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether this assignment is currently active",
    )

    def __repr__(self) -> str:
        return f"<AgentAssignment id={self.id} agent_id={self.agent_id} borrower_id={self.borrower_id}>"
