"""
services/risk_engine/app/services/underwriting.py
-------------------------------------------------
High-level underwriting rules and policy enforcement.
"""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import RiskScore, RiskTier, FraudFlag, UserRole

class UnderwritingPolicy:
    @staticmethod
    async def can_approve_loan(
        session: AsyncSession, 
        application_id: uuid.UUID, 
        approver_role: str
    ) -> tuple[bool, str]:
        """
        Enforce underwriting policy:
        1. No critical/high fraud flags.
        2. Tier D requires SuperAdmin.
        3. Score must exist.
        """
        # 1. Fetch Score
        stmt = select(RiskScore).where(RiskScore.application_id == application_id).order_by(RiskScore.created_at.desc())
        result = await session.execute(stmt)
        score = result.scalar_one_or_none()
        
        if not score:
            return False, "SCORING_PENDING"
            
        # 2. Check Fraud Flags
        stmt = select(FraudFlag).where(
            FraudFlag.user_id == score.user_id,
            FraudFlag.resolved == False,
            FraudFlag.severity.in_(["critical", "high"])
        )
        result = await session.execute(stmt)
        if result.scalars().first():
            return False, "UNRESOLVED_FRAUD_FLAGS"
            
        # 3. Check Tier D + Role
        if score.risk_tier == RiskTier.D:
            if approver_role != UserRole.SUPERADMIN:
                return False, "INSUFFICIENT_SCORE_REQUIRES_SUPERADMIN"
                
        return True, "OK"

    @staticmethod
    async def compute_recommended_amount(
        session: AsyncSession,
        application_id: uuid.UUID,
        score: RiskScore
    ):
        from shared.models import LoanApplication, LoanProduct
        from decimal import Decimal
        
        stmt = select(LoanApplication).where(LoanApplication.id == application_id)
        result = await session.execute(stmt)
        app = result.scalar_one_or_none()
        
        if not app:
            return Decimal("0.00")
            
        stmt = select(LoanProduct).where(LoanProduct.id == app.product_id)
        result = await session.execute(stmt)
        product = result.scalar_one_or_none()
        
        if not product:
            return Decimal("0.00")
            
        requested = app.amount
        
        if score.risk_tier == RiskTier.A:
            recommended = Decimal(product.max_amount)
        elif score.risk_tier == RiskTier.B:
            recommended = Decimal(product.max_amount) * Decimal("0.8")
        elif score.risk_tier == RiskTier.C:
            recommended = Decimal(product.max_amount) * Decimal("0.5")
        else:
            recommended = Decimal("0.00")
            
        # Don't recommend more than what was requested
        return min(recommended, requested)
