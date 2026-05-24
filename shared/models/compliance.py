"""
shared/models/compliance.py
---------------------------
ORM models for the Compliance domain.

Tables:
  - audit_logs      → Immutable, append-only system-wide action log
  - consent_records → NDPC/GDPR borrower consent tracking

CRITICAL:
  audit_logs is physically immutable. There is no updated_at column.
  The PostgreSQL role used by the application MUST NOT have UPDATE or
  DELETE privileges on this table (enforced via DB migration grant).

  See: infra/migrations/versions/<initial>.py for the REVOKE statement.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import Base


# ---------------------------------------------------------------------------
# audit_logs  (NO updated_at — immutable append-only)
# ---------------------------------------------------------------------------

class AuditLog(Base):
    """
    Immutable audit log entry.

    Records every state-changing action in the platform:
      - Loan status transitions
      - KYC decisions
      - User account changes
      - Admin actions
      - Disbursement and repayment events

    IMMUTABILITY CONTRACT:
      - No updated_at column
      - Application DB role has SELECT + INSERT only on this table
      - No DELETE permitted at any layer (data retention via partitioning Phase 2)

    Actor types:
      user | admin | system | webhook | celery_task
    """
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
        comment="UUID primary key (server-generated)",
    )
    # timestamp is set server-side to prevent clock skew
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
        comment="Server-side timestamp of the action (cannot be client-supplied)",
    )
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="UUID of the actor (user.id, admin.id, or null for system actions)",
    )
    actor_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Actor classification: user | admin | system | webhook | celery_task",
    )
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment=(
            "Action verb: loan.status_changed | user.suspended | kyc.verified | "
            "disbursement.initiated | repayment.received | penalty.applied | ..."
        ),
    )
    entity_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Affected entity table name (e.g. 'loans', 'users', 'kyc_records')",
    )
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="UUID of the affected entity row",
    )
    diff: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment=(
            "State diff: {before: {status: 'pending_review'}, after: {status: 'approved'}}. "
            "PII fields must be excluded from diff payloads."
        ),
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address (IPv4 or IPv6) from the triggering request",
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="HTTP User-Agent from the triggering request",
    )
    request_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Correlation request ID for tracing through distributed logs",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Free-text context (e.g. reviewer rejection reason)",
    )

    def __repr__(self) -> str:
        return (
            f"<AuditLog id={self.id} action={self.action!r} "
            f"entity={self.entity_type}/{self.entity_id}>"
        )


# ---------------------------------------------------------------------------
# consent_records
# ---------------------------------------------------------------------------

class ConsentRecord(Base):
    """
    NDPC-compliant consent record. Tracks when a user granted or revoked
    each type of consent and from which IP address.

    Consent types:
      terms_and_conditions | privacy_policy | credit_check |
      data_sharing_bureau | marketing | data_sharing_mono
    """
    __tablename__ = "consent_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
        comment="UUID primary key",
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="FK → users.id",
    )
    consent_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment=(
            "Type of consent: terms_and_conditions | privacy_policy | "
            "credit_check | data_sharing_bureau | marketing | data_sharing_mono"
        ),
    )
    granted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        comment="True = consent granted, False = consent withheld or revoked",
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address at time of consent action",
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of consent action (grant or initial withholding)",
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when consent was subsequently revoked (null if still active)",
    )
    version: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="Version of the terms/policy document consented to (e.g. 'v1.2')",
    )
    source: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Capture surface: mobile_app | admin_dashboard | api",
    )

    def __repr__(self) -> str:
        return (
            f"<ConsentRecord id={self.id} user_id={self.user_id} "
            f"type={self.consent_type!r} granted={self.granted}>"
        )


# ---------------------------------------------------------------------------
# webhook_logs
# ---------------------------------------------------------------------------

class WebhookLog(Base):
    """
    Log of all incoming third-party webhooks for reconciliation and debugging.
    """
    __tablename__ = "webhook_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    error_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<WebhookLog id={self.id} provider={self.provider!r} valid={self.signature_valid}>"
