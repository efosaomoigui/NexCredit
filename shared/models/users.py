"""
shared/models/users.py
----------------------
ORM models for the Users & Borrowers domain.

Tables:
  - users            → Core identity record (auth)
  - borrower_profiles → Extended borrower demographic data
  - admin_users      → Staff/admin account metadata
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    Enum,
    String,
    Text,
    func,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models.base import AuditableMixin, Base

import enum as py_enum


# ---------------------------------------------------------------------------
# Enums (also reflected in PostgreSQL as native ENUM types)
# ---------------------------------------------------------------------------

class UserRole(str, py_enum.Enum):
    BORROWER   = "borrower"
    AGENT      = "agent"
    REVIEWER   = "reviewer"
    ADMIN      = "admin"
    SUPERADMIN = "superadmin"


class UserStatus(str, py_enum.Enum):
    ACTIVE    = "active"
    SUSPENDED = "suspended"
    CLOSED    = "closed"


class Gender(str, py_enum.Enum):
    MALE   = "male"
    FEMALE = "female"
    OTHER  = "other"


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------

class User(Base, AuditableMixin):
    """
    Core user identity record. One per platform participant.
    Phone is the primary identifier; email is optional.
    Password is stored as an Argon2 or bcrypt hash — NEVER plaintext.
    """
    __tablename__ = "users"

    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
        comment="E.164 format Nigerian phone number (primary login identifier)",
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
        index=True,
        comment="Optional email address",
    )
    password_hash: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Argon2id password hash — never store plaintext",
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=True),
        nullable=False,
        default=UserRole.BORROWER,
        comment="Platform role controlling RBAC access",
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, name="user_status", create_type=True),
        nullable=False,
        default=UserStatus.ACTIVE,
        comment="Account lifecycle state",
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of last successful login",
    )

    # Relationships
    profile: Mapped[Optional["BorrowerProfile"]] = relationship(
        back_populates="user", uselist=False, lazy="select"
    )
    admin_profile: Mapped[Optional["AdminUser"]] = relationship(
        back_populates="user", uselist=False, lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} role={self.role} status={self.status}>"


# ---------------------------------------------------------------------------
# borrower_profiles
# ---------------------------------------------------------------------------

class BorrowerProfile(Base, AuditableMixin):
    """
    Extended demographic and financial profile for borrower-role users.
    Completed during the onboarding KYC flow.
    """
    __tablename__ = "borrower_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → users.id",
    )
    full_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Legal full name as on government ID",
    )
    dob: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=False),
        nullable=True,
        comment="Date of birth (date only — time component ignored)",
    )
    gender: Mapped[Optional[Gender]] = mapped_column(
        Enum(Gender, name="gender", create_type=True),
        nullable=True,
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Residential address (free text)",
    )
    state_of_residence: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Nigerian state of residence",
    )
    employer: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Current employer or business name",
    )
    employment_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="e.g. salaried, self-employed, POS operator, logistics, student",
    )
    monthly_income: Mapped[Optional[int]] = mapped_column(
        nullable=True,
        comment="Declared monthly income in Naira (kobo not used here)",
    )
    bvn_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether BVN has been verified by a KYC provider",
    )
    nin_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether NIN has been verified by a KYC provider",
    )

    # Relationship back to User
    user: Mapped["User"] = relationship(back_populates="profile", lazy="select")

    def __repr__(self) -> str:
        return f"<BorrowerProfile id={self.id} user_id={self.user_id}>"


# ---------------------------------------------------------------------------
# admin_users
# ---------------------------------------------------------------------------

class AdminUser(Base, AuditableMixin):
    """
    Supplementary record for staff users (reviewer / admin / superadmin).
    Tracks permissions and session metadata.
    """
    __tablename__ = "admin_users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → users.id",
    )
    display_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Staff display name for the admin UI",
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_type=False),
        nullable=False,
        comment="Mirrors users.role — denormalised for quick admin queries",
    )
    permissions: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
        comment="Fine-grained permission flags (e.g. ['approve_loans', 'view_reports'])",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether this admin account is currently active",
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last successful login timestamp for audit purposes",
    )
    department: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Organisational department (e.g. Risk, Collections, Operations)",
    )

    # Relationship
    user: Mapped["User"] = relationship(back_populates="admin_profile", lazy="select")

    def __repr__(self) -> str:
        return f"<AdminUser id={self.id} role={self.role} active={self.is_active}>"
