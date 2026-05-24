"""
shared/models/settings.py
------------------------
Persistent system configuration stored in Postgres.

This module currently holds engine-level controls that allow ops/admin
to enable/disable platform engines for controlled testing and visibility.
"""
from __future__ import annotations

from sqlalchemy import Boolean, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.models.base import AuditableMixin, Base


class EngineControl(Base, AuditableMixin):
    __tablename__ = "engine_controls"

    engine_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique engine identifier (e.g., identity_engine, payment_engine)",
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether this engine is enabled for use by the platform",
    )

    def __repr__(self) -> str:
        return f"<EngineControl engine_key={self.engine_key} is_enabled={self.is_enabled}>"


class PricingPolicyConfig(Base, AuditableMixin):
    __tablename__ = "pricing_policy_configs"

    version: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
        comment="Policy version identifier (e.g., pricing_policy_v2)",
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="draft",
        comment="draft|published|active",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    config: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="Policy JSON payload (thresholds, multipliers, score gates).",
    )
    created_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<PricingPolicyConfig version={self.version} status={self.status} active={self.is_active}>"
