"""
shared/models/kyc.py
--------------------
ORM models for the KYC (Know Your Customer) domain.

Tables:
  - kyc_records         → Aggregate KYC status per borrower
  - identity_documents  → Individual document uploads and OCR results
  - bank_accounts       → Verified bank accounts (account_number encrypted)
  - verification_logs   → Raw provider response audit trail
"""
from __future__ import annotations

import enum as py_enum
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.encryption.fields import EncryptedString
from shared.models.base import AuditableMixin, Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class KycStatus(str, py_enum.Enum):
    PENDING  = "pending"
    PARTIAL  = "partial"
    VERIFIED = "verified"
    FAILED   = "failed"


class DocType(str, py_enum.Enum):
    NIN_SLIP         = "nin_slip"
    VOTERS_CARD      = "voters_card"
    DRIVERS_LICENSE  = "drivers_license"
    INTERNATIONAL_PASSPORT = "international_passport"
    UTILITY_BILL     = "utility_bill"
    CAC_CERTIFICATE  = "cac_certificate"


class VerificationType(str, py_enum.Enum):
    BVN     = "bvn"
    NIN     = "nin"
    SELFIE  = "selfie"
    BANK    = "bank"
    ADDRESS = "address"


class VerificationProvider(str, py_enum.Enum):
    YOUVERIFY    = "youverify"
    DOJAH        = "dojah"
    MONO         = "mono"
    PAYSTACK     = "paystack"
    INTERNAL     = "internal"


# ---------------------------------------------------------------------------
# kyc_records
# ---------------------------------------------------------------------------

class KycRecord(Base, AuditableMixin):
    """
    Aggregate KYC status record for a borrower.
    One record per user — updated as each verification step completes.

    bvn_hash and nin_hash store the AES-256-GCM encrypted BVN/NIN values.
    They are NEVER stored as plaintext.
    """
    __tablename__ = "kyc_records"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True,
        comment="FK → users.id (one KYC record per user)",
    )
    bvn_hash: Mapped[Optional[str]] = mapped_column(
        EncryptedString(length=512),
        nullable=True,
        comment="AES-256-GCM encrypted BVN value — NEVER plaintext",
    )
    nin_hash: Mapped[Optional[str]] = mapped_column(
        EncryptedString(length=512),
        nullable=True,
        comment="AES-256-GCM encrypted NIN value — NEVER plaintext",
    )
    bvn_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="True when BVN verified by a KYC provider",
    )
    nin_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="True when NIN verified by a KYC provider",
    )
    selfie_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="Liveness + face-match confidence score (0.0000–1.0000)",
    )
    status: Mapped[KycStatus] = mapped_column(
        Enum(KycStatus, name="kyc_status", create_type=True),
        nullable=False,
        default=KycStatus.PENDING,
        comment="Aggregate KYC verification status",
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when all required verifications passed",
    )
    identity_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="Composite identity confidence score used in risk scoring (0.0–1.0)",
    )

    def __repr__(self) -> str:
        return f"<KycRecord id={self.id} user_id={self.user_id} status={self.status}>"


# ---------------------------------------------------------------------------
# identity_documents
# ---------------------------------------------------------------------------

class IdentityDocument(Base, AuditableMixin):
    """
    Individual identity document uploaded by a borrower.
    The actual file is stored in GCS; only the object key is held here.
    Access requires a 15-minute pre-signed URL — never a direct public URL.
    """
    __tablename__ = "identity_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="FK → users.id",
    )
    doc_type: Mapped[DocType] = mapped_column(
        Enum(DocType, name="doc_type", create_type=True),
        nullable=False,
        comment="Category of the identity document",
    )
    s3_key: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        comment="GCS object key (path within the KYC bucket). Never a public URL.",
    )
    extracted_data: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="OCR/extraction results from the document (name, DOB, ID number, etc.)",
    )
    confidence_score: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 4),
        nullable=True,
        comment="OCR extraction confidence score (0.0000–1.0000)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="False if superseded by a later upload of the same doc_type",
    )

    def __repr__(self) -> str:
        return f"<IdentityDocument id={self.id} type={self.doc_type} user_id={self.user_id}>"


# ---------------------------------------------------------------------------
# bank_accounts
# ---------------------------------------------------------------------------

class BankAccount(Base, AuditableMixin):
    """
    Verified bank account linked to a borrower.
    account_number is AES-256-GCM encrypted via EncryptedString TypeDecorator.
    Repayments and disbursements reference this record via FK.
    """
    __tablename__ = "bank_accounts"
    __table_args__ = (
        UniqueConstraint("user_id", "bank_code", "account_number_hash",
                         name="uq_bank_accounts_user_bank_account"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="FK → users.id",
    )
    # Encrypted account number stored via EncryptedString TypeDecorator
    account_number: Mapped[str] = mapped_column(
        EncryptedString(length=512),
        nullable=False,
        comment="AES-256-GCM encrypted NUBAN account number",
    )
    # SHA-256 hash of (user_id + bank_code + account_number) for uniqueness checking
    # without decrypting. Not PII — safe for indexing.
    account_number_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        comment="SHA-256 hash for duplicate detection without decryption",
    )
    bank_code: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        comment="CBN bank/institution code (e.g. '044' for Access Bank)",
    )
    bank_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Bank name for display purposes",
    )
    account_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Account holder name as returned by bank verification (NIBSS/Paystack)",
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether this is the primary account for repayments",
    )
    verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="True when account name verified via bank API",
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of bank account verification",
    )
    mono_account_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Mono account ID if linked via Mono open banking",
    )

    def __repr__(self) -> str:
        return f"<BankAccount id={self.id} bank_code={self.bank_code} primary={self.is_primary}>"


# ---------------------------------------------------------------------------
# verification_logs
# ---------------------------------------------------------------------------

class VerificationLog(Base):
    """
    Immutable log of every KYC verification API call.
    Raw provider responses are stored in JSONB for audit and debugging.
    No updated_at — this table is append-only.
    """
    __tablename__ = "verification_logs"

    import uuid as _uuid
    from sqlalchemy import func as _func

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=__import__("sqlalchemy").func.gen_random_uuid(),
        comment="UUID primary key",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=__import__("sqlalchemy").func.now(),
        nullable=False,
        comment="Verification call timestamp",
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="FK → users.id",
    )
    verification_type: Mapped[VerificationType] = mapped_column(
        Enum(VerificationType, name="verification_type", create_type=True),
        nullable=False,
        comment="Type of verification performed",
    )
    provider: Mapped[VerificationProvider] = mapped_column(
        Enum(VerificationProvider, name="verification_provider", create_type=True),
        nullable=False,
        comment="Third-party KYC provider used",
    )
    result: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Outcome: 'pass', 'fail', 'error', 'inconclusive'",
    )
    raw_response: Mapped[Optional[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Full JSON response from provider (PII masked before storage)",
    )
    reference_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Provider's reference/request ID for tracing",
    )

    def __repr__(self) -> str:
        return (
            f"<VerificationLog id={self.id} type={self.verification_type} "
            f"provider={self.provider} result={self.result}>"
        )


class TestBvnIdentity(Base, AuditableMixin):
    """
    Seeded test BVN identities for non-production onboarding flow.
    This table is used only when third-party BVN provider is unavailable
    or when sandbox mode is explicitly enabled.
    """
    __tablename__ = "test_bvn_identities"

    bvn: Mapped[str] = mapped_column(
        String(11),
        nullable=False,
        unique=True,
        index=True,
        comment="11-digit test BVN identifier",
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="Expected phone tied to the test identity",
    )
    first_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )
    dob: Mapped[Optional[date]] = mapped_column(
        nullable=True,
        comment="Date of birth for test identity",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )


class SimCreditProfile(Base, AuditableMixin):
    """
    Simulation dataset for credit-score checks while external bureaus are unavailable.
    Tied to BVN values from test identities.
    """
    __tablename__ = "sim_credit_profiles"

    bvn: Mapped[str] = mapped_column(
        String(11),
        nullable=False,
        index=True,
        unique=True,
        comment="BVN this simulated score belongs to",
    )
    score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Simulated credit score (0-100 scale for dev)",
    )
    score_band: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        comment="Band label for display/testing (A/B/C/D)",
    )
    risk_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Risk label (low/medium/high)",
    )
    recommended_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Suggested approval limit in Naira",
    )
    decision_hint: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="approve/manual_review/decline",
    )
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class SimBankAccount(Base, AuditableMixin):
    """
    Simulation dataset for bank account lookup and account-name verification.
    """
    __tablename__ = "sim_bank_accounts"
    __table_args__ = (
        UniqueConstraint("bank_code", "account_number", name="uq_sim_bank_code_account_number"),
    )

    bank_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_number: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bvn: Mapped[Optional[str]] = mapped_column(
        String(11),
        nullable=True,
        index=True,
        comment="Optional BVN linkage for deterministic simulations",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
