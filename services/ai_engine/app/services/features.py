"""
services/ai_engine/app/services/features.py
-------------------------------------------
Computation of normalized feature vectors for AI models.
"""
import uuid
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import User, BureauReport, BankingData, Loan, RepaymentSchedule
import redis.asyncio as redis
import json

class FeatureStore:
    @staticmethod
    async def compute_feature_vector(session: AsyncSession, user_id: uuid.UUID) -> np.ndarray:
        """
        Compute a normalized 10-dimension feature vector for a borrower.
        """
        # Bureau Data
        res = await session.execute(select(BureauReport).where(BureauReport.user_id == user_id).order_by(BureauReport.created_at.desc()))
        bureau = res.scalars().first()
        bureau_score = (bureau.score / 850.0) if bureau else 0.5
        
        # Banking Data
        res = await session.execute(select(BankingData).where(BankingData.user_id == user_id).order_by(BankingData.created_at.desc()))
        banking = res.scalars().first()
        salary_score = (banking.salary_consistency / 100.0) if banking else 0.0
        stability_score = (banking.cashflow_stability / 100.0) if banking else 0.0
        gambling_flag = 1.0 if (banking and banking.has_gambling_activity) else 0.0
        
        # Loan History
        res = await session.execute(select(Loan).where(Loan.user_id == user_id))
        loans = res.scalars().all()
        num_loans = float(len(loans))
        
        # Repayment Rate
        if num_loans > 0:
            repaid_count = len([l for l in loans if l.status == "FULLY_REPAID"])
            repayment_rate = repaid_count / num_loans
        else:
            repayment_rate = 0.5 # Neutral for first-timers
            
        # Composite Identity/Device Risk (Mocked from latest Risk Score)
        # In production, pull from fraud_flags or device_fingerprints
        identity_conf = 0.9 # Default
        device_risk = 0.1 # Default
        
        # Assembly
        vector = np.array([
            bureau_score,
            salary_score,
            stability_score,
            gambling_flag,
            repayment_rate,
            device_risk,
            identity_conf,
            num_loans / 10.0, # Normalised to max 10
            0.1, # Days since creation (mock)
            0.1  # Number of apps (mock)
        ], dtype=np.float32)
        
        # Redis Caching
        r = redis.Redis(host='localhost', port=6379, decode_responses=True)
        await r.set(f"features:{user_id}", json.dumps(vector.tolist()), ex=86400)
        
        return vector
