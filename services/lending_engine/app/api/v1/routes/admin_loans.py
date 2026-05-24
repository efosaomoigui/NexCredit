"""
services/lending_engine/app/api/v1/routes/admin_loans.py
---------------------------------------------------------
Admin endpoints for loan review and approval.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import (
    User, LoanApplication, LoanApplicationStatus, RiskScore, RiskTier, FraudFlag, UserRole, BorrowerProfile, Loan
)
from shared.auth.deps import get_current_admin
from shared.response import success_response, error_response
from services.lending_engine.app.schemas.loans import LoanReviewRequest
from services.lending_engine.app.services.state_machine import StateMachine
from services.lending_engine.app.services.pricing_policy import PricingPolicyService

router = APIRouter(prefix="/admin/loans", tags=["Admin Lending"])

@router.get("/")
async def list_applications(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = (
        select(LoanApplication, User, BorrowerProfile, Loan)
        .join(User, User.id == LoanApplication.user_id)
        .outerjoin(BorrowerProfile, BorrowerProfile.user_id == User.id)
        .outerjoin(Loan, Loan.application_id == LoanApplication.id)
        .order_by(LoanApplication.created_at.desc())
    )
    if status:
        stmt = stmt.where(LoanApplication.status == status)
    
    result = await db.execute(stmt)
    rows = result.all()
    apps = []
    for app, user, profile, loan in rows:
        apps.append(
            {
                "id": str(app.id),
                "user_id": str(app.user_id),
                "borrower_name": profile.full_name if profile and profile.full_name else None,
                "borrower_phone": user.phone,
                "borrower_email": user.email,
                "requested_amount": app.requested_amount,
                "approved_amount": app.approved_amount,
                "loan_product_id": str(app.product_id),
                "tenor": app.tenor,
                "status": app.status.value.upper(),
                "created_at": app.created_at.isoformat() if app.created_at else None,
                "loan_id": str(loan.id) if loan else None,
                "loan_status": loan.status.value.upper() if loan else None,
                "loan_outstanding_balance": loan.outstanding_balance if loan else None,
            }
        )
    return success_response(data=apps)

@router.get("/{application_id}")
async def get_application_detail(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanApplication).where(LoanApplication.id == application_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    # Fetch Risk Score
    stmt = select(RiskScore).where(RiskScore.application_id == application_id).order_by(RiskScore.created_at.desc())
    res = await db.execute(stmt)
    score = res.scalar_one_or_none()
    
    # Fetch Fraud Flags
    stmt = select(FraudFlag).where(FraudFlag.user_id == app.user_id, FraudFlag.resolved == False)
    res = await db.execute(stmt)
    flags = res.scalars().all()
    
    return success_response(data={
        "application": app,
        "risk_score": score,
        "fraud_flags": flags
    })

@router.post("/{application_id}/approve")
async def approve_application(
    application_id: uuid.UUID,
    data: LoanReviewRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanApplication).where(LoanApplication.id == application_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app or app.status != LoanApplicationStatus.PENDING_REVIEW:
        raise HTTPException(status_code=400, detail="Invalid application status for approval")
        
    # 1. Fetch Risk Tier
    stmt = select(RiskScore).where(RiskScore.application_id == application_id).order_by(RiskScore.created_at.desc())
    res = await db.execute(stmt)
    score = res.scalar_one_or_none()
    
    tier = score.risk_tier if score else RiskTier.D
    
    # 2. Check Permissions based on Tier
    if tier == RiskTier.D:
        if admin.role != UserRole.SUPERADMIN:
            return error_response(message="Tier D requires SuperAdmin approval", status_code=403)
    elif tier == RiskTier.C:
        if admin.role not in [UserRole.ADMIN, UserRole.SUPERADMIN]:
            return error_response(message="Tier C requires Admin or SuperAdmin approval", status_code=403)

    # 3. Check for unresolved fraud flags
    stmt = select(FraudFlag).where(FraudFlag.user_id == app.user_id, FraudFlag.resolved == False)
    res = await db.execute(stmt)
    if res.scalars().first():
        return error_response(message="Cannot approve: Unresolved fraud flags exist.", status_code=403)
    
    # 4. Transition Status
    app.approved_amount = data.approved_amount or app.requested_amount
    app.reviewed_by = admin.id
    from datetime import datetime, timezone
    app.decision_at = datetime.now(timezone.utc)
    app.notes = data.decision_notes
    
    await StateMachine.transition(db, app, LoanApplicationStatus.APPROVED, admin.id, reason=data.decision_notes)
    await StateMachine.transition(db, app, LoanApplicationStatus.AGREEMENT_PENDING, admin.id)
    
    await db.commit()
    return success_response(message="Application approved. Agreement sent to borrower.")

@router.post("/{application_id}/reject")
async def reject_application(
    application_id: uuid.UUID,
    reason: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(LoanApplication).where(LoanApplication.id == application_id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    
    if not app or app.status not in [LoanApplicationStatus.SUBMITTED, LoanApplicationStatus.PENDING_REVIEW]:
        raise HTTPException(status_code=400, detail="Invalid status for rejection")
        
    app.rejection_reason = reason
    app.reviewed_by = admin.id
    
    await StateMachine.transition(db, app, LoanApplicationStatus.REJECTED, admin.id, reason=reason)
    await db.commit()
    
    return success_response(message="Application rejected.")

@router.get("/stats")
async def get_loan_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    from sqlalchemy import func
    from shared.models import Loan, LoanStatus
    
    # 1. Total Disbursed
    stmt = select(func.sum(LoanApplication.approved_amount)).where(LoanApplication.status == LoanApplicationStatus.DISBURSED)
    total_disbursed = (await db.execute(stmt)).scalar() or 0
    
    # 2. Active Loans Count
    stmt = select(func.count(Loan.id)).where(Loan.status == LoanStatus.ACTIVE)
    active_count = (await db.execute(stmt)).scalar() or 0
    
    # 3. Overdue Rate (NPL)
    stmt_total = select(func.count(Loan.id)).where(Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.OVERDUE, LoanStatus.PARTIALLY_REPAID]))
    stmt_overdue = select(func.count(Loan.id)).where(Loan.status == LoanStatus.OVERDUE)
    
    total_portfolio = (await db.execute(stmt_total)).scalar() or 1
    overdue_count = (await db.execute(stmt_overdue)).scalar() or 0
    npl_rate = (overdue_count / total_portfolio) * 100
    
    return success_response(data={
        "total_disbursed": float(total_disbursed),
        "active_loans": active_count,
        "npl_rate": round(npl_rate, 1),
        "repayment_rate": 94.2, # Mock for now
        "weekly_disbursed": float(total_disbursed) * 0.2 # Mock trend
    })


@router.get("/pricing-preview/{user_id}")
async def pricing_preview(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """
    Admin visibility endpoint for dynamic pricing/eligibility decisions.
    """
    u_stmt = select(User).where(User.id == user_id)
    borrower = (await db.execute(u_stmt)).scalar_one_or_none()
    if not borrower:
        raise HTTPException(status_code=404, detail="User not found")
    decision = await PricingPolicyService.evaluate_for_user(db, borrower)
    return success_response(data=decision)
