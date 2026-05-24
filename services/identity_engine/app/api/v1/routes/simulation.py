from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.database import get_db
from shared.models import SimBankAccount, SimCreditProfile, TestBvnIdentity
from shared.response import success_response, error_response

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post("/bvn/verify")
async def sim_verify_bvn(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    bvn = str(payload.get("bvn", "")).strip()
    if len(bvn) != 11:
        return error_response(code="INVALID_BVN", message="BVN must be 11 digits.", status_code=400)

    row = (await db.execute(select(TestBvnIdentity).where(TestBvnIdentity.bvn == bvn, TestBvnIdentity.is_active == True))).scalar_one_or_none()
    if not row:
        return error_response(code="BVN_NOT_FOUND", message="BVN not found in simulation dataset.", status_code=404)

    return success_response(
        data={
            "verified": True,
            "bvn": row.bvn,
            "first_name": row.first_name,
            "last_name": row.last_name,
            "phone": row.phone,
            "dob": row.dob.isoformat() if row.dob else None,
        },
        meta={"provider_status": "fallback", "trace_id": request.headers.get("X-Trace-Id")},
    )


@router.post("/credit/score")
async def sim_credit_score(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    bvn = str(payload.get("bvn", "")).strip()
    if len(bvn) != 11:
        return error_response(code="INVALID_BVN", message="BVN must be 11 digits.", status_code=400)

    row = (await db.execute(select(SimCreditProfile).where(SimCreditProfile.bvn == bvn, SimCreditProfile.is_current == True))).scalar_one_or_none()
    if not row:
        return error_response(code="CREDIT_PROFILE_NOT_FOUND", message="Credit profile not found in simulation dataset.", status_code=404)

    return success_response(
        data={
            "bvn": row.bvn,
            "score": row.score,
            "score_band": row.score_band,
            "risk_level": row.risk_level,
            "recommended_limit": row.recommended_limit,
            "decision_hint": row.decision_hint,
        },
        meta={"provider_status": "fallback", "trace_id": request.headers.get("X-Trace-Id")},
    )


@router.post("/bank/lookup")
async def sim_bank_lookup(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    bank_code = str(payload.get("bank_code", "")).strip()
    account_number = str(payload.get("account_number", "")).strip()
    if len(account_number) != 10 or not bank_code:
        return error_response(code="INVALID_BANK_INPUT", message="bank_code and 10-digit account_number are required.", status_code=400)

    row = (
        await db.execute(
            select(SimBankAccount).where(
                SimBankAccount.bank_code == bank_code,
                SimBankAccount.account_number == account_number,
                SimBankAccount.is_active == True,
            )
        )
    ).scalar_one_or_none()
    if not row:
        return error_response(code="BANK_ACCOUNT_NOT_FOUND", message="Bank account not found in simulation dataset.", status_code=404)

    return success_response(
        data={
            "bank_code": row.bank_code,
            "bank_name": row.bank_name,
            "account_number": row.account_number,
            "account_name": row.account_name,
            "bvn": row.bvn,
        },
        meta={"provider_status": "fallback", "trace_id": request.headers.get("X-Trace-Id")},
    )
