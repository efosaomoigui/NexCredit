"""
services/risk_engine/app/services/scorer.py
-------------------------------------------
Composite credit scoring and tier assignment.
"""
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import (
    RiskScore, RiskTier, LoanApplication, LoanApplicationStatus, 
    KycRecord
)
from services.risk_engine.app.services.bureau import BureauService
from services.risk_engine.app.services.banking import BankingService
from services.risk_engine.app.services.history import HistoryService
from services.risk_engine.app.services.device import DeviceService
from services.risk_engine.app.services.fraud import FraudService

class ScorerService:
    @staticmethod
    async def compute_composite_score(
        session: AsyncSession, 
        application_id: uuid.UUID
    ) -> RiskScore:
        """
        Main scoring pipeline. Orchestrates all signals and computes weighted score.
        """
        # 1. Fetch Application and User
        stmt = select(LoanApplication).where(LoanApplication.id == application_id)
        result = await session.execute(stmt)
        app = result.scalar_one_or_none()
        if not app:
            raise ValueError("Application not found")
        
        user_id = app.user_id
        
        # 2. Gather Signals
        bureau_data = await BureauService.pull_bureau_report(session, user_id)
        # Normalize bureau score to 0-100 (Assumes 300-850 range)
        b_score = max(0, min(100, (bureau_data["score"] - 300) / 5.5))
        
        banking_signal = await BankingService.analyse_bank_behaviour(user_id)
        history_score = await HistoryService.compute_internal_score(session, user_id)
        
        # Get identity score from KycRecord
        stmt = select(KycRecord).where(KycRecord.user_id == user_id)
        res = await session.execute(stmt)
        kyc = res.scalar_one_or_none()
        id_score = float(kyc.identity_confidence * 100) if kyc and kyc.identity_confidence else 0.0
        
        # Device score (mock inputs for now)
        device_score = await DeviceService.compute_device_score(
            session, user_id, "mock_device_hash", "127.0.0.1"
        )
        
        # 3. Apply Weights
        # composite = (bureau * 0.35 + banking * 0.25 + history * 0.20 + identity * 0.10 + device * 0.10)
        composite = (
            b_score * 0.35 +
            banking_signal.behaviour_score * 0.25 +
            history_score * 0.20 +
            id_score * 0.10 +
            device_score * 0.10
        )
        
        # 4. Assign Tier
        if composite >= 80:
            tier = RiskTier.A
        elif composite >= 60:
            tier = RiskTier.B
        elif composite >= 40:
            tier = RiskTier.C
        else:
            tier = RiskTier.D
            
        # 5. Persist Snapshot
        risk_score = RiskScore(
            user_id=user_id,
            application_id=application_id,
            composite_score=Decimal(str(round(composite, 2))),
            bureau_score=Decimal(str(round(b_score, 2))),
            bank_behaviour_score=Decimal(str(round(banking_signal.behaviour_score, 2))),
            internal_score=Decimal(str(round(history_score, 2))),
            identity_score=Decimal(str(round(id_score, 2))),
            behavioural_score=Decimal(str(round(device_score, 2))),
            risk_tier=tier,
            model_version="v1.0.0",
            score_breakdown={
                "bureau": b_score,
                "banking": banking_signal.behaviour_score,
                "history": history_score,
                "identity": id_score,
                "device": device_score
            }
        )
        session.add(risk_score)
        
        # 6. Update Application Status
        app.status = LoanApplicationStatus.PENDING_REVIEW
        
        # 7. Run Fraud Checks
        await FraudService.run_fraud_checks(session, user_id, application_id)
        
        await session.commit()
        return risk_score
