"""
services/risk_engine/app/services/banking.py
--------------------------------------------
Analysis of banking behaviour via Mono Open Banking.
"""
import uuid
from decimal import Decimal
from typing import Any, Optional
from pydantic import BaseModel

class BankingSignal(BaseModel):
    salary_consistency: float # 0-100
    cashflow_stability: float # 0-100
    gambling_flag: bool
    suspicious_inflows: bool
    existing_obligations: float
    behaviour_score: float # 0-100

class BankingService:
    @staticmethod
    async def analyse_bank_behaviour(user_id: uuid.UUID) -> BankingSignal:
        """
        Analyse last 6 months of transactions from Mono.
        Mocked for Phase 1.
        """
        # In production:
        # 1. Fetch Mono transactions
        # 2. Identify salary credits
        # 3. Detect MCCs for gambling
        # 4. Compute metrics
        
        # Mocking realistic signals
        return BankingSignal(
            salary_consistency=90.0,
            cashflow_stability=85.0,
            gambling_flag=False,
            suspicious_inflows=False,
            existing_obligations=15000.0,
            behaviour_score=88.0
        )
