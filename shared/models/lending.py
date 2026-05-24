"""
shared/models/lending.py
------------------------
ORM models for the Lending domain.

Tables:
  - loan_products         → Product catalog (interest rates, limits, eligibility)
  - loan_applications     → Application lifecycle with full state machine
  - loans                 → Active/completed loan records
  - repayment_schedules   → Per-installment repayment schedule
  - repayments            → Individual repayment events (idempotent by reference)
  - penalties             → Late payment penalties applied to loans
  - disbursements         → Disbursement events (idempotent by reference)
"""
from __future__ import annotations

import enum as py_enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.models.base import AuditableMixin, Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LoanApplicationStatus(str, py_enum.Enum):
    DRAFT            = "draft"
    SUBMITTED        = "submitted"
    BUREAU_PENDING   = "bureau_pending"
    SCORING          = "scoring"
    PENDING_REVIEW   = "pending_review"
    APPROVED         = "approved"
    AGREEMENT_PENDING = "agreement_pending"
    AGREEMENT_SIGNED = "agreement_signed"
    DISBURSE_PENDING = "disburse_pending"
    DISBURSED        = "disbursed"
    ACTIVE           = "active"
    PARTIALLY_REPAID = "partially_repaid"
    FULLY_REPAID     = "fully_repaid"
    OVERDUE          = "overdue"
    WRITTEN_OFF      = "written_off"
    REJECTED         = "rejected"


class LoanStatus(str, py_enum.Enum):
    ACTIVE           = "active"
    PARTIALLY_REPAID = "partially_repaid"
    FULLY_REPAID     = "fully_repaid"
    OVERDUE          = "overdue"
    WRITTEN_OFF      = "written_off"
    CANCELLED        = "cancelled"


class ScheduleStatus(str, py_enum.Enum):
    PENDING = "pending"
    PAID    = "paid"
    OVERDUE = "overdue"
    WAIVED  = "waived"


class DisbursementStatus(str, py_enum.Enum):
    PENDING   = "pending"
    INITIATED = "initiated"
    SUCCESS   = "success"
    FAILED    = "failed"
    REVERSED  = "reversed"


# ---------------------------------------------------------------------------
# loan_products
# ---------------------------------------------------------------------------

class LoanProduct(Base, AuditableMixin):
    """
    Configurable loan product defining amounts, tenors, and interest rates.
    """
    __tablename__ = "loan_products"

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        comment="Human-readable product name (e.g. 'QuickCash 14')",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Product description shown to borrowers",
    )
    min_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Minimum loan amount in Naira",
    )
    max_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Maximum loan amount in Naira — hard cap at ₦25,000 (Phase 1)",
    )
    min_tenor: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Minimum loan tenor in days",
    )
    max_tenor: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Maximum loan tenor in days — hard cap at 30 (Phase 1)",
    )
    interest_rate: Mapped[Decimal] = mapped_column(
        Numeric(6, 4),
        nullable=False,
        comment="Flat interest rate as a decimal (e.g. 0.0500 = 5%)",
    )
    fees: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Fee schedule",
    )
    eligibility_rules: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Eligibility constraints",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether this product is currently available",
    )

    # Relationships
    applications: Mapped[list["LoanApplication"]] = relationship(
        back_populates="product", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<LoanProduct id={self.id} name={self.name!r}>"


# ---------------------------------------------------------------------------
# loan_applications
# ---------------------------------------------------------------------------

class LoanApplication(Base, AuditableMixin):
    """
    Full application lifecycle record.
    """
    __tablename__ = "loan_applications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → users.id (applicant)",
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → loan_products.id",
    )
    requested_amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Amount requested by borrower in Naira",
    )
    approved_amount: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Amount approved by reviewer",
    )
    tenor: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Requested repayment tenor in days",
    )
    status: Mapped[LoanApplicationStatus] = mapped_column(
        Enum(LoanApplicationStatus, name="loan_application_status", create_type=True),
        nullable=False,
        default=LoanApplicationStatus.DRAFT,
        index=True,
        comment="Current state in the loan lifecycle",
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the borrower formally submitted the application",
    )
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="FK → users.id (reviewer)",
    )
    decision_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of approve/reject decision",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Reviewer notes",
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    purpose: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    product: Mapped["LoanProduct"] = relationship(back_populates="applications", lazy="select")
    loan: Mapped[Optional["Loan"]] = relationship(back_populates="application", uselist=False)

    def __repr__(self) -> str:
        return f"<LoanApplication id={self.id} status={self.status}>"


# ---------------------------------------------------------------------------
# loans
# ---------------------------------------------------------------------------

class Loan(Base, AuditableMixin):
    """
    Active loan record.
    """
    __tablename__ = "loans"

    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loan_applications.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → loan_applications.id",
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → users.id",
    )
    principal: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Disbursed principal in Naira",
    )
    interest: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Total interest charge",
    )
    fees: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    total_due: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    amount_repaid: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    outstanding_balance: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    due_date: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )
    status: Mapped[LoanStatus] = mapped_column(
        Enum(LoanStatus, name="loan_status", create_type=True),
        nullable=False,
        default=LoanStatus.ACTIVE,
        index=True,
    )
    days_overdue: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    # Relationships
    application: Mapped["LoanApplication"] = relationship(
        back_populates="loan", lazy="select"
    )
    repayment_schedules: Mapped[list["RepaymentSchedule"]] = relationship(
        back_populates="loan", lazy="select", order_by="RepaymentSchedule.installment_no"
    )
    repayments: Mapped[list["Repayment"]] = relationship(
        back_populates="loan", lazy="select"
    )
    penalties: Mapped[list["Penalty"]] = relationship(
        back_populates="loan", lazy="select"
    )
    disbursements: Mapped[list["Disbursement"]] = relationship(
        back_populates="loan", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Loan id={self.id} status={self.status}>"


# ---------------------------------------------------------------------------
# repayment_schedules
# ---------------------------------------------------------------------------

class RepaymentSchedule(Base, AuditableMixin):
    __tablename__ = "repayment_schedules"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installment_no: Mapped[int] = mapped_column(Integer, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_due: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[ScheduleStatus] = mapped_column(
        Enum(ScheduleStatus, name="schedule_status", create_type=True),
        nullable=False,
        default=ScheduleStatus.PENDING,
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    loan: Mapped["Loan"] = relationship(back_populates="repayment_schedules", lazy="select")
    repayments: Mapped[list["Repayment"]] = relationship(
        back_populates="schedule", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<RepaymentSchedule id={self.id} loan_id={self.loan_id}>"


# ---------------------------------------------------------------------------
# repayments
# ---------------------------------------------------------------------------

class Repayment(Base, AuditableMixin):
    __tablename__ = "repayments"
    __table_args__ = (
        UniqueConstraint("payment_reference", name="uq_repayments_payment_reference"),
    )

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    schedule_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("repayment_schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    amount_paid: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_reference: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    provider_response: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    processed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    loan: Mapped["Loan"] = relationship(back_populates="repayments", lazy="select")
    schedule: Mapped[Optional["RepaymentSchedule"]] = relationship(
        back_populates="repayments", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Repayment id={self.id} ref={self.payment_reference}>"


# ---------------------------------------------------------------------------
# penalties
# ---------------------------------------------------------------------------

class Penalty(Base, AuditableMixin):
    __tablename__ = "penalties"

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    applied_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=__import__("sqlalchemy").func.now(),
    )
    waived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    waived_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    waived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    waiver_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    loan: Mapped["Loan"] = relationship(back_populates="penalties", lazy="select")

    def __repr__(self) -> str:
        return f"<Penalty id={self.id} amount={self.amount}>"


# ---------------------------------------------------------------------------
# disbursements
# ---------------------------------------------------------------------------

class Disbursement(Base, AuditableMixin):
    __tablename__ = "disbursements"
    __table_args__ = (
        UniqueConstraint("reference", name="uq_disbursements_reference"),
    )

    loan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    destination_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bank_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    reference: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    status: Mapped[DisbursementStatus] = mapped_column(
        Enum(DisbursementStatus, name="disbursement_status", create_type=True),
        nullable=False,
        default=DisbursementStatus.PENDING,
    )
    disbursed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    provider_response: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    initiated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationship
    loan: Mapped["Loan"] = relationship(back_populates="disbursements", lazy="select")

    def __repr__(self) -> str:
        return f"<Disbursement id={self.id} status={self.status}>"
