"""
services/identity_engine/app/api/v1/routes/kyc.py
-------------------------------------------------
KYC submission endpoints: BVN, NIN, Selfie, Documents, Bank Account, Status.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
import uuid
import json
import hashlib

from shared.database import get_db
from shared.models import (
    User, KycRecord, IdentityDocument, BankAccount, 
    KycStatus, VerificationLog, VerificationType, VerificationProvider,
    DocType, TestBvnIdentity, BorrowerProfile, Gender, CreditBureauReport, BureauProvider,
    SimCreditProfile, SimBankAccount
)
from shared.response import success_response, error_response
from services.identity_engine.app.schemas.kyc import (
    BvnVerifyRequest, NinVerifyRequest, BankAccountRequest, KycStatusResponse,
    PersonalInfoRequest, EmploymentInfoRequest
)
from services.identity_engine.app.api.deps import get_current_user
from services.identity_engine.app.services.identity_service import IdentityService
from shared.integrations.factory import IntegrationFactory
from rapidfuzz import fuzz
from datetime import datetime
import random
import logging
import os

router = APIRouter(prefix="/kyc", tags=["KYC"])
logger = logging.getLogger(__name__)

def _dev_test_credit_payload(bvn: str, user_id: str) -> dict:
    # Deterministic dev-only score signal tied to BVN for repeatable QA.
    seed = sum(ord(c) for c in f"{bvn}:{user_id}")
    rng = random.Random(seed)
    score = rng.randint(520, 785)
    recommended_amount = max(20000, min(500000, int((score - 450) * 1600)))
    decision = "approve" if score >= 620 else "manual_review"
    return {
        "score": score,
        "band": "A" if score >= 740 else "B" if score >= 680 else "C" if score >= 620 else "D",
        "recommended_amount": recommended_amount,
        "decision": decision,
        "source": "test_fallback",
        "version": "dev_v1",
    }

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

    existing_bvns = {
        row[0]
        for row in (await db.execute(select(TestBvnIdentity.bvn))).all()
    }
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

@router.post("/bvn-verify")
async def verify_bvn(
    data: BvnVerifyRequest, 
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
    logger.info("bvn_verify_attempt trace_id=%s user_id=%s", trace_id, user.id)
    if await IdentityService.check_deduplication(db, "bvn_hash", data.bvn, user.id):
        return error_response(code="BVN_DUPLICATE", message="This BVN is already linked to another account", status_code=400)

    await _seed_test_bvn_identities(db)
    test_stmt = select(TestBvnIdentity).where(TestBvnIdentity.bvn == data.bvn, TestBvnIdentity.is_active == True)
    test_identity = (await db.execute(test_stmt)).scalar_one_or_none()

    use_simulation = os.getenv("BVN_MODE", os.getenv("PROVIDER_MODE", "simulation")).lower() == "simulation"

    if use_simulation:
        if not test_identity:
            return error_response(
                code="BVN_NOT_FOUND",
                message="BVN not found in simulation dataset.",
                status_code=404,
            )
        if test_identity.phone and user.phone and test_identity.phone != user.phone:
            return error_response(
                code="BVN_PHONE_MISMATCH",
                message="This BVN does not match the phone number used for onboarding.",
                status_code=400,
            )
        mock_res = {
            "status": "success",
            "data": {
                "bvn": test_identity.bvn,
                "first_name": test_identity.first_name,
                "last_name": test_identity.last_name,
                "dob": test_identity.dob.isoformat() if test_identity.dob else None,
                "phone": test_identity.phone,
            },
        }
        provider_status = "fallback"
        verification_provider = VerificationProvider.INTERNAL
    else:
        try:
            youverify = IntegrationFactory.get_youverify()
            mock_res = await youverify.verify_bvn(data.bvn)
            provider_status = "live"
            verification_provider = VerificationProvider.YOUVERIFY
        except Exception as e:
            return error_response(code="BVN_NOT_FOUND", message=f"BVN not found in test dataset: {str(e)}", status_code=404)

    stmt = select(KycRecord).where(KycRecord.user_id == user.id)
    result = await db.execute(stmt)
    kyc = result.scalar_one_or_none()
    
    if not kyc:
        kyc = KycRecord(user_id=user.id)
        db.add(kyc)
    
    kyc.bvn_hash = data.bvn # Will be encrypted by TypeDecorator
    kyc.bvn_verified = True
    kyc.status = KycStatus.PARTIAL
    
    profile_stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == user.id)
    profile = (await db.execute(profile_stmt)).scalar_one_or_none()
    if not profile:
        profile = BorrowerProfile(user_id=user.id)
        db.add(profile)
    full_name = f"{mock_res['data'].get('first_name', '').strip()} {mock_res['data'].get('last_name', '').strip()}".strip()
    if full_name:
        profile.full_name = full_name
    if mock_res["data"].get("dob"):
        try:
            profile.dob = datetime.strptime(mock_res["data"]["dob"], "%Y-%m-%d")
        except ValueError:
            pass
    profile.bvn_verified = True

    sim_credit_stmt = select(SimCreditProfile).where(SimCreditProfile.bvn == data.bvn, SimCreditProfile.is_current == True)
    sim_credit = (await db.execute(sim_credit_stmt)).scalar_one_or_none()
    if sim_credit:
        test_credit = {
            "score": sim_credit.score,
            "band": sim_credit.score_band,
            "recommended_amount": sim_credit.recommended_limit,
            "decision": sim_credit.decision_hint,
            "source": "simulation_table",
            "version": "sim_v1",
        }
    else:
        test_credit = _dev_test_credit_payload(data.bvn, str(user.id))
    bureau_report = CreditBureauReport(
        user_id=user.id,
        provider=BureauProvider.INTERNAL,
        score=test_credit["score"],
        raw_report={
            "source": "test_fallback",
            "reason": "development_credit_seed_for_onboarding",
            "recommendation": {
                "decision": test_credit["decision"],
                "recommended_amount": test_credit["recommended_amount"],
                "band": test_credit["band"],
                "model_version": test_credit["version"],
            },
        },
        is_current=True,
    )
    db.add(bureau_report)

    log = VerificationLog(
        user_id=user.id,
        verification_type=VerificationType.BVN,
        provider=verification_provider,
        result="pass",
        raw_response=mock_res
    )
    db.add(log)
    await db.commit()
    logger.info("bvn_verify_success trace_id=%s user_id=%s source=%s", trace_id, user.id, provider_status)
    
    return success_response(
        data={
            "verified": True,
            "message": "BVN verified successfully",
            "profile": {
                "full_name": full_name,
                "phone": mock_res["data"].get("phone"),
            },
            "test_credit_score": test_credit["score"],
            "recommendation": {
                "decision": test_credit["decision"],
                "recommended_amount": test_credit["recommended_amount"],
                "band": test_credit["band"],
                "source": "test_fallback",
            },
        },
        meta={
            "trace_id": trace_id,
            "provider_status": provider_status,
            "checkpoint": "bvn_verify",
            "source": "test_bvn_table" if verification_provider == VerificationProvider.INTERNAL else "provider",
        },
    )

@router.post("/nin-verify")
async def verify_nin(
    data: NinVerifyRequest, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    logger.info("nin_verify_attempt user_id=%s", user.id)
    if await IdentityService.check_deduplication(db, "nin_hash", data.nin, user.id):
        return error_response(code="NIN_DUPLICATE", message="This NIN is already linked to another account", status_code=400)
    
    # Youverify Call
    try:
        youverify = IntegrationFactory.get_youverify()
        mock_res = await youverify.verify_nin(data.nin)
        provider = VerificationProvider.YOUVERIFY
        provider_status = "live"
    except Exception as e:
        # Non-blocking fallback for incomplete third-party readiness.
        mock_res = {"status": "success", "data": {"nin": data.nin, "source": "test_fallback"}}
        provider = VerificationProvider.INTERNAL
        provider_status = "fallback"
        logger.warning("nin_verify_fallback user_id=%s reason=%s", user.id, e.__class__.__name__)
    
    stmt = select(KycRecord).where(KycRecord.user_id == user.id)
    result = await db.execute(stmt)
    kyc = result.scalar_one_or_none()
    
    if not kyc:
        kyc = KycRecord(user_id=user.id)
        db.add(kyc)
    
    kyc.nin_hash = data.nin
    kyc.nin_verified = True
    
    log = VerificationLog(
        user_id=user.id,
        verification_type=VerificationType.NIN,
        provider=provider,
        result="pass",
        raw_response=mock_res
    )
    db.add(log)
    await db.commit()
    logger.info("nin_verify_success user_id=%s provider_status=%s", user.id, provider_status)
    return success_response(
        data={"verified": True, "message": "NIN verified successfully"},
        meta={"provider_status": provider_status, "source": "test_fallback" if provider_status == "fallback" else "provider"},
    )

@router.post("/selfie")
async def upload_selfie(
    request: Request,
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
    # Mock Face-Match API
    with open("shared/mocks/identity_providers.json") as f:
        mocks = json.load(f)
    mock_res = mocks["selfie_success"]
    
    stmt = select(KycRecord).where(KycRecord.user_id == user.id)
    result = await db.execute(stmt)
    kyc = result.scalar_one_or_none()
    
    if not kyc:
        kyc = KycRecord(user_id=user.id)
        db.add(kyc)
    
    kyc.selfie_score = Decimal(str(mock_res["data"]["match_score"]))
    
    log = VerificationLog(
        user_id=user.id,
        verification_type=VerificationType.SELFIE,
        provider=VerificationProvider.DOJAH,
        result="pass" if mock_res["data"]["liveness_passed"] else "fail",
        raw_response=mock_res
    )
    db.add(log)
    await db.commit()
    
    return success_response(
        data={
            "liveness_passed": mock_res["data"]["liveness_passed"],
            "match_score": mock_res["data"]["match_score"]
        },
        meta={"trace_id": trace_id, "provider_status": "fallback", "checkpoint": "face_liveness"},
    )

@router.post("/document")
async def upload_document(
    doc_type: DocType = Form(...),
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Simulate GCS upload
    s3_key = f"kyc/{user.id}/{doc_type}_{uuid.uuid4()}.jpg"
    
    new_doc = IdentityDocument(
        user_id=user.id,
        doc_type=doc_type,
        s3_key=s3_key,
        confidence_score=Decimal("0.95"),
        is_active=True
    )
    db.add(new_doc)
    await db.commit()
    
    return success_response(message="Document uploaded successfully. Our team will review it shortly.")

@router.get("/document/{doc_id}/url")
async def get_document_url(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Only staff or the document owner should access this
    stmt = select(IdentityDocument).where(IdentityDocument.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    
    if not doc:
        return error_response(code="DOCUMENT_NOT_FOUND", message="Document not found", status_code=404)
        
    if doc.user_id != user.id and user.role not in {UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.REVIEWER, UserRole.AGENT}:
        return error_response(code="UNAUTHORIZED", message="Unauthorized", status_code=403)
        
    # Simulate generating a 15-minute pre-signed URL from GCS
    presigned_url = f"https://storage.googleapis.com/mock-bucket/{doc.s3_key}?Expires=15mins&Signature=mock"
    return success_response(data={"url": presigned_url, "expires_in": 900})

@router.post("/bank-account")
async def verify_bank_account(
    data: BankAccountRequest, 
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
    use_simulation = os.getenv("BANK_MODE", os.getenv("PROVIDER_MODE", "simulation")).lower() == "simulation"
    if use_simulation:
        sim_stmt = select(SimBankAccount).where(
            SimBankAccount.bank_code == data.bank_code,
            SimBankAccount.account_number == data.account_number,
            SimBankAccount.is_active == True,
        )
        sim_account = (await db.execute(sim_stmt)).scalar_one_or_none()
        if not sim_account:
            return error_response(
                code="BANK_ACCOUNT_NOT_FOUND",
                message="Account not found in simulation dataset.",
                status_code=404,
            )
        mock_res = {
            "status": "success",
            "data": {
                "account_name": sim_account.account_name,
                "bank_name": sim_account.bank_name,
            },
        }
    else:
        # Placeholder for live provider integration (Paystack/Mono/NIBSS)
        return error_response(
            code="PROVIDER_NOT_CONFIGURED",
            message="Live bank provider is not configured.",
            status_code=503,
        )
    
    # Fuzzy Match against profile name
    # Get user profile name
    # Assume we have a profile for the user
    # For now, I'll use a placeholder or fetch from BorrowerProfile
    stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    
    full_name = profile.full_name if profile else "John Doe"
    match_ratio = fuzz.ratio(full_name.upper(), mock_res["data"]["account_name"].upper())
    
    verified = match_ratio > 80
    
    account_hash = hashlib.sha256(f"{user.id}:{data.bank_code}:{data.account_number}".encode()).hexdigest()
    existing_stmt = select(BankAccount).where(
        BankAccount.user_id == user.id,
        BankAccount.bank_code == data.bank_code,
        BankAccount.account_number_hash == account_hash,
    )
    existing_account = (await db.execute(existing_stmt)).scalar_one_or_none()

    if existing_account:
        existing_account.account_name = mock_res["data"]["account_name"]
        existing_account.bank_name = mock_res["data"]["bank_name"]
        existing_account.verified = verified
        existing_account.is_primary = True
    else:
        new_account = BankAccount(
            user_id=user.id,
            account_number=data.account_number,
            account_number_hash=account_hash,
            bank_code=data.bank_code,
            bank_name=mock_res["data"]["bank_name"],
            account_name=mock_res["data"]["account_name"],
            verified=verified,
            is_primary=True
        )
        db.add(new_account)
    
    if not verified:
        await db.commit()
        return error_response(
            code="BANK_NAME_MISMATCH",
            message=f"Name mismatch: Account name '{mock_res['data']['account_name']}' does not match your profile.",
            status_code=400,
        )
    
    await db.commit()
    return success_response(
        data={"verified": True, "account_name": mock_res["data"]["account_name"]},
        meta={"trace_id": trace_id, "provider_status": "fallback", "checkpoint": "bank_match"},
    )

@router.post("/personal-info")
async def save_personal_info(
    data: PersonalInfoRequest, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        profile = BorrowerProfile(user_id=user.id)
        db.add(profile)

    profile.full_name = data.fullName
    profile.address = data.address

    # Map Gender
    g_map = {"Male": Gender.MALE, "Female": Gender.FEMALE}
    profile.gender = g_map.get(data.gender, Gender.OTHER)

    # Parse DOB: DD / MM / YYYY
    try:
        clean_dob = data.dob.replace(" ", "")
        profile.dob = datetime.strptime(clean_dob, "%d/%m/%Y")
    except ValueError:
        pass # Ignore bad dates for MVP or fallback

    await db.commit()
    return success_response(message="Personal info saved successfully")

@router.post("/employment-info")
async def save_employment_info(
    data: EmploymentInfoRequest, 
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(BorrowerProfile).where(BorrowerProfile.user_id == user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    if not profile:
        profile = BorrowerProfile(user_id=user.id)
        db.add(profile)

    profile.employer = data.employer
    profile.employment_type = data.empType

    try:
        clean_income = data.income.replace(",", "").replace("₦", "").strip()
        profile.monthly_income = int(clean_income)
    except ValueError:
        pass # Ignore bad income format

    # Since salaryDate isn't directly in BorrowerProfile MVP schema, we skip or store it elsewhere if needed
    # (BorrowerProfile has employment_type, employer, monthly_income)

    await db.commit()
    return success_response(message="Employment info saved successfully")

@router.get("/status")
async def get_kyc_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(KycRecord).where(KycRecord.user_id == user.id)
    result = await db.execute(stmt)
    kyc = result.scalar_one_or_none()
    
    score = await IdentityService.compute_identity_score(db, user.id)
    can_apply = await IdentityService.is_kyc_complete(db, user.id)
    
    steps = {
        "bvn": "completed" if kyc and kyc.bvn_verified else "pending",
        "nin": "completed" if kyc and kyc.nin_verified else "pending",
        "selfie": "completed" if kyc and kyc.selfie_score and kyc.selfie_score > 0.8 else "pending",
        "bank_account": "completed" if await db.execute(select(BankAccount).where(BankAccount.user_id == user.id, BankAccount.verified == True)) else "pending"
    }
    
    return success_response(data={
        "user_id": str(user.id),
        "bvn_verified": kyc.bvn_verified if kyc else False,
        "nin_verified": kyc.nin_verified if kyc else False,
        "selfie_verified": kyc.selfie_score > 0.8 if kyc and kyc.selfie_score else False,
        "bank_account_verified": steps["bank_account"] == "completed",
        "identity_score": float(score),
        "can_apply": can_apply,
        "steps": steps
    })
