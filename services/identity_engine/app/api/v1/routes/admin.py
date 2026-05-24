"""
services/identity_engine/app/api/v1/routes/admin.py
---------------------------------------------------
Admin endpoints for KYC management and overrides.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import uuid
import json
from datetime import datetime
import logging

from shared.database import get_db
from shared.models import User, KycRecord, VerificationLog, AuditLog, KycStatus, TestBvnIdentity, CreditBureauReport, BorrowerProfile
from shared.response import success_response, error_response
from services.identity_engine.app.api.deps import get_current_admin
from services.identity_engine.app.schemas.kyc import AdminOverrideRequest

router = APIRouter(prefix="/admin/kyc", tags=["Admin KYC"])
logger = logging.getLogger(__name__)

async def _seed_test_bvn_identities(db: AsyncSession):
    with open("shared/mocks/identity_providers.json") as f:
        mocks = json.load(f)
    sample = mocks.get("bvn_success", {}).get("data", {})
    base_records = [
        {
            "bvn": sample.get("bvn", "22123456789"),
            "phone": sample.get("phone", "+2348012345678"),
            "first_name": sample.get("first_name", "John"),
            "last_name": sample.get("last_name", "Doe"),
            "dob": sample.get("dob", "1992-04-12"),
        },
        {"bvn": "22345678901", "phone": "+2348091110001", "first_name": "Ada", "last_name": "Okafor", "dob": "1994-08-21"},
        {"bvn": "22567890123", "phone": "+2348091110002", "first_name": "Musa", "last_name": "Bello", "dob": "1989-01-09"},
        {"bvn": "22789012345", "phone": "+2348091110003", "first_name": "Kemi", "last_name": "Adebayo", "dob": "1996-11-03"},
    ]
    existing_bvns = {row[0] for row in (await db.execute(select(TestBvnIdentity.bvn))).all()}
    created = 0
    for record in base_records:
        if record["bvn"] in existing_bvns:
            continue
        dob = None
        if record.get("dob"):
            try:
                dob = datetime.strptime(record["dob"], "%Y-%m-%d").date()
            except ValueError:
                dob = None
        db.add(
            TestBvnIdentity(
                bvn=record["bvn"],
                phone=record["phone"],
                first_name=record["first_name"],
                last_name=record["last_name"],
                dob=dob,
                is_active=True,
            )
        )
        created += 1
    if created:
        await db.commit()

@router.get("/test-bvn-identities")
async def list_test_bvn_identities(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    logger.info("admin_test_bvn_fetch_started admin_id=%s", admin.id)
    await _seed_test_bvn_identities(db)
    stmt = select(TestBvnIdentity).order_by(TestBvnIdentity.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()
    data = []
    for r in rows:
        user_stmt = select(User).where(User.phone == r.phone) if r.phone else None
        user = (await db.execute(user_stmt)).scalar_one_or_none() if user_stmt is not None else None
        profile = None
        kyc = None
        bureau = None
        recommendation = None
        if user:
            profile = (await db.execute(select(BorrowerProfile).where(BorrowerProfile.user_id == user.id))).scalar_one_or_none()
            kyc = (await db.execute(select(KycRecord).where(KycRecord.user_id == user.id))).scalar_one_or_none()
            bureau = (
                await db.execute(
                    select(CreditBureauReport)
                    .where(CreditBureauReport.user_id == user.id)
                    .order_by(CreditBureauReport.created_at.desc())
                    .limit(1)
                )
            ).scalar_one_or_none()
            recommendation = (bureau.raw_report or {}).get("recommendation") if bureau and bureau.raw_report else None

        data.append(
            {
                "id": str(r.id),
                "bvn": r.bvn,
                "phone": r.phone,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "dob": r.dob.isoformat() if r.dob else None,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "source": "test_fallback",
                "onboarding_status": "completed" if kyc and kyc.bvn_verified and kyc.selfie_score else "in_progress",
                "linked_user_id": str(user.id) if user else None,
                "full_name": profile.full_name if profile else None,
                "bvn_verified": bool(kyc.bvn_verified) if kyc else False,
                "test_credit_score": bureau.score if bureau else None,
                "recommendation": recommendation,
                "recommendation_source": (bureau.raw_report or {}).get("source") if bureau and bureau.raw_report else None,
            }
        )
    logger.info("admin_test_bvn_fetch_completed admin_id=%s records=%s", admin.id, len(data))
    return success_response(data=data)

@router.get("/pending")
async def list_pending_kyc(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """List borrowers with incomplete KYC."""
    # Logic: users with status active but KYC record not verified
    stmt = select(User).where(
        User.role == "borrower"
    ).outerjoin(KycRecord).where(
        (KycRecord.status != KycStatus.VERIFIED) | (KycRecord.id == None)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return success_response(data=[{"id": str(u.id), "phone": u.phone, "email": u.email} for u in users])

@router.get("/{user_id}")
async def get_user_kyc_detail(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Full KYC record for one borrower including verification logs."""
    # Fetch User
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Fetch KYC Record
    stmt = select(KycRecord).where(KycRecord.user_id == user_id)
    res = await db.execute(stmt)
    kyc = res.scalar_one_or_none()
    
    # Fetch Logs
    stmt = select(VerificationLog).where(VerificationLog.user_id == user_id).order_by(VerificationLog.created_at.desc())
    res = await db.execute(stmt)
    logs = res.scalars().all()
    
    return success_response(data={
        "user": {"id": str(user.id), "phone": user.phone, "role": user.role},
        "kyc": kyc,
        "logs": logs
    })

@router.post("/{user_id}/override")
async def manual_kyc_override(
    user_id: uuid.UUID,
    data: AdminOverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Manual KYC approval with reason (logged to audit_logs)."""
    stmt = select(KycRecord).where(KycRecord.user_id == user_id)
    res = await db.execute(stmt)
    kyc = res.scalar_one_or_none()
    
    if not kyc:
        kyc = KycRecord(user_id=user_id)
        db.add(kyc)
    
    old_status = kyc.status
    kyc.status = KycStatus.VERIFIED
    
    # Audit Log
    audit = AuditLog(
        actor_id=admin.id,
        actor_type="admin",
        action="kyc.manual_override",
        entity_type="kyc_records",
        entity_id=kyc.id,
        notes=data.reason,
        diff={"before": {"status": str(old_status)}, "after": {"status": "verified"}}
    )
    db.add(audit)
    await db.commit()
    
    return success_response(message=f"KYC status for user {user_id} manually overridden to verified.")
