"""
services/risk_engine/app/services/bureau.py
-------------------------------------------
Integration with credit bureaus (CRC, FirstCentral).
"""
import uuid
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.models import CreditBureauReport, BureauProvider, KycRecord
from shared.integrations.factory import IntegrationFactory

class BureauService:
    @staticmethod
    async def pull_bureau_report(
        session: AsyncSession, 
        user_id: uuid.UUID, 
        provider: BureauProvider = BureauProvider.CRC
    ) -> dict[str, Any]:
        """
        Pulls a credit bureau report for the user.
        Uses cached report if less than 30 days old.
        """
        # 1. Check cache
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        stmt = select(CreditBureauReport).where(
            CreditBureauReport.user_id == user_id,
            CreditBureauReport.pulled_at >= thirty_days_ago,
            CreditBureauReport.is_current == True
        ).order_by(CreditBureauReport.pulled_at.desc()).limit(1)
        
        result = await session.execute(stmt)
        cached_report = result.scalar_one_or_none()
        
        if cached_report:
            return {
                "score": cached_report.score,
                "active_loans": cached_report.active_loans,
                "delinquencies": cached_report.delinquencies,
                "total_outstanding": cached_report.total_outstanding,
                "cached": True
            }
            
        # 2. Get User BVN
        stmt = select(KycRecord).where(KycRecord.user_id == user_id)
        result = await session.execute(stmt)
        kyc = result.scalar_one_or_none()
        
        if not kyc or not kyc.bvn_hash:
            raise ValueError("User BVN not found or unverified")
            
        bvn = kyc.bvn_hash

        # 3. Bureau API Call
        try:
            if provider == BureauProvider.CRC:
                crc_client = IntegrationFactory.get_crc()
                bureau_data = await crc_client.get_report(bvn)
            else:
                raise NotImplementedError(f"Provider {provider} not yet supported")
        except Exception as e:
            raise RuntimeError(f"Bureau pull failed: {str(e)}")
        
        # 4. Store in DB
        new_report = CreditBureauReport(
            user_id=user_id,
            provider=provider,
            raw_report=bureau_data["raw_response"],
            score=bureau_data["score"],
            active_loans=bureau_data["active_loans"],
            delinquencies=bureau_data["delinquencies"],
            total_outstanding=bureau_data["total_outstanding"],
            pulled_at=datetime.now(timezone.utc),
            is_current=True
        )
        session.add(new_report)
        await session.commit()
        
        return {**bureau_data, "cached": False}
