"""
shared/models/__init__.py
-------------------------
Centralised model registry. Import all models here so Alembic's
autogenerate can discover every table in a single metadata sweep.

Usage in alembic/env.py::

    from shared.models import Base, metadata   # noqa: F401
    target_metadata = Base.metadata
"""
from shared.models.base import (
    AuditableMixin,
    Base,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)

# --- Domain models (order matters for FK resolution) -----------------------
from shared.models.users import (
    AdminUser,
    BorrowerProfile,
    Gender,
    User,
    UserRole,
    UserStatus,
)
from shared.models.kyc import (
    BankAccount,
    DocType,
    IdentityDocument,
    KycRecord,
    KycStatus,
    SimBankAccount,
    SimCreditProfile,
    TestBvnIdentity,
    VerificationLog,
    VerificationProvider,
    VerificationType,
)
from shared.models.lending import (
    Disbursement,
    DisbursementStatus,
    Loan,
    LoanApplication,
    LoanApplicationStatus,
    LoanProduct,
    LoanStatus,
    Penalty,
    Repayment,
    RepaymentSchedule,
    ScheduleStatus,
)
from shared.models.risk import (
    BureauProvider,
    CreditBureauReport,
    DeviceFingerprint,
    FraudFlag,
    FraudSeverity,
    RiskScore,
    RiskTier,
)
from shared.models.collections import (
    CollectionNote,
    EscalationLog,
    AgentAssignment,
    Notification,
    NotificationChannel,
    NotificationStatus,
    PromiseToPay,
    PtpStatus,
)
from shared.models.compliance import (
    AuditLog,
    ConsentRecord,
)
from shared.models.settings import (
    EngineControl,
    PricingPolicyConfig,
)
from shared.models.crm import (
    SupportTicket,
    TicketMessage,
    TicketStatus,
)
from shared.auth.rbac import Role

# Backward-compat aliases for legacy imports still used by some services
KYCRecord = KycRecord
BureauReport = CreditBureauReport
BankingData = BankAccount

# Expose metadata for Alembic
metadata = Base.metadata

__all__ = [
    # Base
    "Base",
    "metadata",
    "AuditableMixin",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    # Users
    "User", "BorrowerProfile", "AdminUser",
    "UserRole", "UserStatus", "Gender",
    # KYC
    "KycRecord", "IdentityDocument", "BankAccount", "VerificationLog",
    "TestBvnIdentity", "SimCreditProfile", "SimBankAccount",
    "KycStatus", "DocType", "VerificationType", "VerificationProvider",
    # Lending
    "LoanProduct", "LoanApplication", "Loan",
    "RepaymentSchedule", "Repayment", "Penalty", "Disbursement",
    "LoanApplicationStatus", "LoanStatus", "ScheduleStatus", "DisbursementStatus",
    # Risk
    "RiskScore", "FraudFlag", "CreditBureauReport", "DeviceFingerprint",
    "RiskTier", "FraudSeverity", "BureauProvider",
    # Collections
    "Notification", "CollectionNote", "EscalationLog", "PromiseToPay", "AgentAssignment",
    "NotificationChannel", "NotificationStatus", "PtpStatus",
    # Compliance
    "AuditLog", "ConsentRecord",
    # Settings
    "EngineControl", "PricingPolicyConfig",
    # CRM
    "SupportTicket", "TicketMessage", "TicketStatus",
    # Legacy aliases
    "Role", "KYCRecord", "BureauReport", "BankingData",
]
