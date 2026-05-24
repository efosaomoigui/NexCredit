"""
services/lending_engine/app/services/state_machine.py
-----------------------------------------------------
Enforcer for loan application and loan status transitions.
"""
import uuid
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import LoanApplication, LoanApplicationStatus, AuditLog, Base, User, UserRole, Loan, LoanStatus
from shared.response import error_response
import os

class StateMachine:
    # Valid transitions map
    TRANSITIONS = {
        LoanApplicationStatus.DRAFT: [LoanApplicationStatus.SUBMITTED],
        LoanApplicationStatus.SUBMITTED: [LoanApplicationStatus.BUREAU_PENDING, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.BUREAU_PENDING: [LoanApplicationStatus.SCORING, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.SCORING: [LoanApplicationStatus.PENDING_REVIEW, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.PENDING_REVIEW: [LoanApplicationStatus.APPROVED, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.APPROVED: [LoanApplicationStatus.AGREEMENT_PENDING],
        LoanApplicationStatus.AGREEMENT_PENDING: [LoanApplicationStatus.AGREEMENT_SIGNED, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.AGREEMENT_SIGNED: [LoanApplicationStatus.DISBURSE_PENDING],
        LoanApplicationStatus.DISBURSE_PENDING: [LoanApplicationStatus.DISBURSED, LoanApplicationStatus.REJECTED],
        LoanApplicationStatus.DISBURSED: [LoanApplicationStatus.ACTIVE],
        LoanApplicationStatus.ACTIVE: [LoanApplicationStatus.PARTIALLY_REPAID, LoanApplicationStatus.OVERDUE, LoanApplicationStatus.FULLY_REPAID],
        LoanApplicationStatus.PARTIALLY_REPAID: [LoanApplicationStatus.FULLY_REPAID, LoanApplicationStatus.OVERDUE],
        LoanApplicationStatus.OVERDUE: [LoanApplicationStatus.FULLY_REPAID, LoanApplicationStatus.WRITTEN_OFF],
    }

    @classmethod
    async def transition(
        cls, 
        session: AsyncSession, 
        application: LoanApplication, 
        to_status: LoanApplicationStatus, 
        actor_id: uuid.UUID,
        reason: Optional[str] = None,
        extra_audit: Optional[dict[str, Any]] = None
    ) -> LoanApplication:
        """
        Validates and executes a state transition.
        Writes to audit_logs before committing.
        """
        current_status = application.status
        
        # Check if transition is legal
        allowed = cls.TRANSITIONS.get(current_status, [])
        if to_status not in allowed:
            raise ValueError(f"Invalid state transition: {current_status} -> {to_status}")
            
        # Check Guards
        if to_status == LoanApplicationStatus.APPROVED:
            # Guard: No automated approvals
            stmt = select(User.role).where(User.id == actor_id)
            actor_role = (await session.execute(stmt)).scalar_one_or_none()
            if actor_role not in {UserRole.REVIEWER, UserRole.AGENT, UserRole.ADMIN, UserRole.SUPERADMIN}:
                raise ValueError("Manual review required: Only staff can approve loans")
                
        if to_status == LoanApplicationStatus.DISBURSE_PENDING:
            # Guard: Capital Ceiling
            max_capital = float(os.getenv("MAX_CAPITAL_CEILING", "50000000")) # 50M default
            stmt = select(func.sum(Loan.principal)).where(Loan.status.in_([
                LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE
            ]))
            current_exposure = (await session.execute(stmt)).scalar_one_or_none() or 0.0
            
            if float(current_exposure) + float(application.amount if hasattr(application, 'amount') else application.approved_amount or application.requested_amount) > max_capital:
                raise ValueError(f"Capital ceiling exceeded. Cannot disburse. Current exposure: {current_exposure}")
            
        # 1. Create Audit Log Entry
        audit = AuditLog(
            actor_id=actor_id,
            actor_type="system" if actor_id == uuid.UUID("00000000-0000-0000-0000-000000000000") else "user",
            action=f"loan.status_change",
            entity_type="loan_applications",
            entity_id=application.id,
            notes=reason or f"Transition from {current_status} to {to_status}",
            diff={
                "before": {"status": str(current_status)},
                "after": {"status": str(to_status)},
                "extra": extra_audit or {}
            }
        )
        session.add(audit)
        
        # 2. Update Application Status
        application.status = to_status
        
        # 3. Flush to ensure constraints are checked but don't commit yet (caller commits)
        await session.flush()
        
        return application
