"""
shared/models/base.py
---------------------
SQLAlchemy declarative base and common mixin for all NexCredit ORM models.

Every model MUST:
  - Use UUID primary key (never sequential integers)
  - Inherit TimestampMixin for audit trails
  - Be declared in the service-specific models/ module
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all NexCredit SQLAlchemy models."""
    pass


class TimestampMixin:
    """
    Mixin that adds created_at and updated_at columns to any model.

    Uses PostgreSQL server-side NOW() for created_at (set once on insert)
    and Python-side datetime for updated_at (updated on every write).
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=lambda: datetime.now(tz=timezone.utc),
        nullable=False,
    )


class UUIDPrimaryKeyMixin:
    """
    Mixin that adds a UUID primary key column.

    The UUID is generated server-side by gen_random_uuid() on PostgreSQL,
    with a Python-side default as fallback.
    """
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )


class AuditableMixin(UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Convenience mixin combining UUID PK + timestamps.
    Use this as the base for most domain models.
    """
    pass
