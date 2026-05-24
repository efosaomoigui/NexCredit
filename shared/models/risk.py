"""
shared/models/risk.py
---------------------
ORM models for the Risk & Fraud domain.

Tables:
  - risk_scores            → Point-in-time composite credit score per application
  - fraud_flags            → Fraud signals raised against users
  - credit_bureau_reports  → Raw bureau report snapshots (CRC / FirstCentral)
  - device_fingerprints    → Device + IP tracking for behavioural risk
"""
from __future__ import annotations

import enum as py_enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import AuditableMixin, Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class RiskTier(str, py_enum.Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class FraudSeverity(str, py_enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class BureauProvider(str, py_enum.Enum):
    CRC          = "crc"
    FIRST_CENTRAL = "first_central"
    INTERNAL     = "internal"


# ---------------------------------------------------------------------------
# risk_scores
# ---------------------------------------------------------------------------

class RiskScore(Base, AuditableMixin):
    """
    Point-in-time credit risk score snapshot for a loan application.
    """
    __tablename__ = "risk_scores"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    composite_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    bureau_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    bank_behaviour_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    internal_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    identity_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    behavioural_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    risk_tier: Mapped[RiskTier] = mapped_column(
        Enum(RiskTier, name="risk_tier", create_type=True),
        nullable=False,
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=__import__("sqlalchemy").func.now(),
    )
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    score_breakdown: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    recommended_amount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<RiskScore id={self.id} score={self.composite_score} tier={self.risk_tier}>"


# ---------------------------------------------------------------------------
# fraud_flags
# ---------------------------------------------------------------------------

class FraudFlag(Base, AuditableMixin):
    __tablename__ = "fraud_flags"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flag_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    severity: Mapped[FraudSeverity] = mapped_column(
        Enum(FraudSeverity, name="fraud_severity", create_type=True),
        nullable=False,
    )
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<FraudFlag id={self.id} type={self.flag_type}>"


# ---------------------------------------------------------------------------
# credit_bureau_reports
# ---------------------------------------------------------------------------

class CreditBureauReport(Base, AuditableMixin):
    __tablename__ = "credit_bureau_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    application_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    provider: Mapped[BureauProvider] = mapped_column(
        Enum(BureauProvider, name="bureau_provider", create_type=True),
        nullable=False,
    )
    raw_report: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    active_loans: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    delinquencies: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_outstanding: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    pulled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=__import__("sqlalchemy").func.now(),
    )
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    def __repr__(self) -> str:
        return f"<CreditBureauReport id={self.id} provider={self.provider}>"


# ---------------------------------------------------------------------------
# device_fingerprints
# ---------------------------------------------------------------------------

class DeviceFingerprint(Base, AuditableMixin):
    __tablename__ = "device_fingerprints"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    first_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=__import__("sqlalchemy").func.now(),
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=__import__("sqlalchemy").func.now(),
    )
    risk_signals: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    risk_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)

    def __repr__(self) -> str:
        return f"<DeviceFingerprint id={self.id} hash={self.device_hash[:12]}>"
