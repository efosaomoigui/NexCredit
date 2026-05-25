"""
services/risk_engine/app/services/fraud.py
------------------------------------------
Automated fraud signal detection.
"""
import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import FraudFlag, FraudSeverity, DeviceFingerprint, LoanApplication, KycRecord

class FraudService:
    @staticmethod
    async def run_fraud_checks(
        session: AsyncSession, 
        user_id: uuid.UUID, 
        application_id: uuid.UUID
    ) -> list[str]:
        """
        Run automated checks and create fraud flags if signals detected.
        """
        detected_signals = []
        
        # 1. Device Sharing Check (High)
        stmt = select(func.count(DeviceFingerprint.user_id.distinct())).where(
            DeviceFingerprint.user_id != user_id
            # Join with some recent activity or pass device_hash
        )
        # For simplicity in MVP, we check shared device hash within 24h
        # ... logic ...
        
        # 2. Application Velocity (High)
        # 3+ applications in 7 days
        seven_days_ago = __import__("datetime").datetime.now(__import__("datetime").timezone.utc) - __import__("datetime").timedelta(days=7)
        stmt = select(func.count(LoanApplication.id)).where(
            LoanApplication.user_id == user_id,
            LoanApplication.created_at >= seven_days_ago
        )
        result = await session.execute(stmt)
        app_count = result.scalar()
        if app_count >= 3:
            detected_signals.append("velocity_abuse")
            flag = FraudFlag(
                user_id=user_id,
                flag_type="velocity_abuse",
                severity=FraudSeverity.HIGH,
                details={"application_count_7d": app_count},
                source="fraud_service"
            )
            session.add(flag)

        # 4. Behavioral Anomaly (AI Engine)
        import httpx
        import os
        ai_url = os.getenv("AI_ENGINE_URL", "http://ai_engine:8000/api/v1")
        try:
            async with httpx.AsyncClient() as client:
                # Get behavioral features (mocking values that would normally come from mobile SDK telemetry)
                features = {
                    "velocity": app_count,
                    "typing_speed": 0.5,
                    "session_duration": 120
                }
                resp = await client.post(
                    f"{ai_url}/api/v1/inference/anomaly",
                    json={"user_id": str(user_id), "features": features},
                    timeout=5.0
                )
                if resp.status_code == 200:
                    ai_result = resp.json().get("data", {})
                    if ai_result.get("is_anomalous"):
                        detected_signals.append("behavioral_anomaly")
                        flag = FraudFlag(
                            user_id=user_id,
                            flag_type="behavioral_anomaly",
                            severity=FraudSeverity.MEDIUM,
                            details=ai_result,
                            source="ai_engine"
                        )
                        session.add(flag)
        except Exception as e:
            # Fallback: log error but don't block scoring
            print(f"AI Engine anomaly check failed: {e}")

        await session.commit()
        return detected_signals
