"""
services/risk_engine/app/services/device.py
-------------------------------------------
Device reputation and fingerprinting analysis.
"""
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.models import DeviceFingerprint

class DeviceService:
    @staticmethod
    async def compute_device_score(
        session: AsyncSession, 
        user_id: uuid.UUID, 
        device_hash: str, 
        ip_address: str
    ) -> float:
        """
        Compute device score based on sharing and IP reputation.
        Base score 70. Deductions for risk signals.
        """
        score = 70.0
        
        # 1. Check for shared device
        stmt = select(func.count(DeviceFingerprint.user_id.distinct())).where(
            DeviceFingerprint.device_hash == device_hash,
            DeviceFingerprint.user_id != user_id
        )
        result = await session.execute(stmt)
        other_users_count = result.scalar()
        
        if other_users_count >= 2:
            score -= 40.0
        elif other_users_count == 1:
            score -= 15.0
            
        # 2. Check IP (Mock blocklist)
        # In production: check against VPN/DC reputation API
        if ip_address.startswith(("10.0.", "192.168.", "172.16.")): # Private IPs as mock DC
            score -= 20.0
            
        # 3. Upsert record
        stmt = select(DeviceFingerprint).where(
            DeviceFingerprint.user_id == user_id,
            DeviceFingerprint.device_hash == device_hash
        )
        res = await session.execute(stmt)
        record = res.scalar_one_or_none()
        
        if record:
            record.last_seen = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
            record.ip_address = ip_address
            record.risk_score = __import__("decimal").Decimal(str(score))
        else:
            record = DeviceFingerprint(
                user_id=user_id,
                device_hash=device_hash,
                ip_address=ip_address,
                risk_score=__import__("decimal").Decimal(str(score))
            )
            session.add(record)
            
        await session.commit()
        return score
