"""
services/risk_engine/app/api/v1/routes/risk.py
----------------------------------------------
Admin endpoints for risk scoring, bureau reports, and fraud flags.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import (
    User, RiskScore, CreditBureauReport, FraudFlag, AuditLog, LoanApplication
)
from shared.response import success_response, error_response
from shared.auth.deps import get_current_admin
from services.risk_engine.app.services.scorer import ScorerService
from services.risk_engine.app.services.underwriting import UnderwritingPolicy
from pydantic import BaseModel

class ScoreRequest(BaseModel):
    application_id: uuid.UUID


router = APIRouter(prefix="/admin/risk", tags=["Admin Risk"])

@router.post("/score")
async def score_application(
    data: ScoreRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """
    Score a loan application. Computes composite score, tier, and recommended amount.
    """
    try:
        score = await ScorerService.compute_composite_score(db, data.application_id)
        
        # Calculate recommended amount
        recommended_amount = await UnderwritingPolicy.compute_recommended_amount(db, data.application_id, score)
        score.recommended_amount = recommended_amount
        await db.commit()
        
        return success_response(data={
            "score_id": str(score.id),
            "composite_score": float(score.composite_score),
            "risk_tier": score.risk_tier.value,
            "recommended_amount": float(score.recommended_amount) if score.recommended_amount else None
        }, message="Scoring completed")
    except ValueError as e:
        return error_response(message=str(e), status_code=400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return error_response(message="Scoring pipeline failed", status_code=500)


@router.get("/{user_id}/score")
async def get_user_risk_score(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Full risk score breakdown with all sub-scores."""
    stmt = select(RiskScore).where(RiskScore.user_id == user_id).order_by(RiskScore.created_at.desc()).limit(1)
    result = await db.execute(stmt)
    score = result.scalar_one_or_none()
    
    if not score:
        raise HTTPException(status_code=404, detail="No risk score found for this user")
        
    return success_response(data=score)

@router.get("/{user_id}/bureau")
async def get_user_bureau_report(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Raw bureau report + parsed summary."""
    stmt = select(CreditBureauReport).where(CreditBureauReport.user_id == user_id).order_by(CreditBureauReport.pulled_at.desc()).limit(1)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="No bureau report found")
        
    return success_response(data=report)
