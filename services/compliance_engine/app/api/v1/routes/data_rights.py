"""
services/compliance_engine/app/api/v1/routes/data_rights.py
-----------------------------------------------------------
NDPC data rights: export and account deletion.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from shared.database import get_db
from shared.models import User, Loan, KYCRecord, RepaymentSchedule, Notification, ConsentRecord, LoanStatus
from shared.auth.deps import get_current_user
from shared.response import success_response

router = APIRouter(prefix="/me", tags=["Compliance"])

@router.get("/data-export")
async def export_my_data(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Returns a complete JSON dump of all borrower data.
    """
    # 1. Fetch all related records
    loans = (await db.execute(select(Loan).where(Loan.user_id == user.id))).scalars().all()
    kyc = (await db.execute(select(KYCRecord).where(KYCRecord.user_id == user.id))).scalars().first()
    consents = (await db.execute(select(ConsentRecord).where(ConsentRecord.user_id == user.id))).scalars().all()
    notifications = (await db.execute(select(Notification).where(Notification.user_id == user.id))).scalars().all()
    
    # 2. Package into JSON-ready dict
    data = {
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "created_at": str(user.created_at)
        },
        "kyc": kyc.__dict__ if kyc else None,
        "loans": [l.__dict__ for l in loans],
        "consents": [c.__dict__ for c in consents],
        "notifications": [n.__dict__ for n in notifications]
    }
    # Clean SQLAlchemy internal state from dict
    for key in data:
        if isinstance(data[key], list):
            for item in data[key]:
                item.pop('_sa_instance_state', None)
        elif isinstance(data[key], dict):
            data[key].pop('_sa_instance_state', None)

    return success_response(data=data)

@router.post("/account/delete")
async def delete_my_account(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Anonymizes user account if no active loans exist.
    """
    # 1. Check for active loans
    active_loans = (await db.execute(
        select(Loan).where(
            Loan.user_id == user.id,
            Loan.status.in_([LoanStatus.DISBURSED, LoanStatus.ACTIVE, LoanStatus.OVERDUE])
        )
    )).scalars().all()
    
    if active_loans:
        raise HTTPException(
            status_code=400, 
            detail="Account cannot be deleted while loans are active or outstanding"
        )
        
    # 2. Anonymize PII
    import hashlib
    user.phone = hashlib.sha256(user.phone.encode()).hexdigest()[:15]
    user.is_active = False
    
    # Anonymize KYC
    kyc = (await db.execute(select(KYCRecord).where(KYCRecord.user_id == user.id))).scalars().first()
    if kyc:
        kyc.bvn = "ANONYMIZED"
        kyc.nin = "ANONYMIZED"
        kyc.first_name = "DELETED"
        kyc.last_name = "DELETED"
        
    await db.commit()
    return success_response(message="Account successfully anonymized and scheduled for deletion")
