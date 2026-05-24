"""
services/lending_engine/app/api/v1/routes/loans.py
--------------------------------------------------
Borrower endpoints for loan applications and products.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import uuid
from datetime import date, timedelta
import logging

from shared.database import get_db
from shared.models import (
    User, LoanProduct, LoanApplication, LoanApplicationStatus,
    KycRecord, Loan, RepaymentSchedule, ConsentRecord, LoanStatus
)
from shared.auth.deps import get_current_user
from shared.response import success_response, error_response
from services.lending_engine.app.schemas.loans import (
    LoanProductResponse, LoanApplicationRequest, LoanApplicationResponse
)
from services.lending_engine.app.services.state_machine import StateMachine
from services.lending_engine.app.services.agreements import AgreementService
from services.lending_engine.app.services.pricing_policy import PricingPolicyService

router = APIRouter(prefix="/loans", tags=["Lending"])
logger = logging.getLogger(__name__)


@router.get("")
async def list_loans(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all loans for the authenticated borrower."""
    stmt = select(Loan).where(Loan.user_id == user.id).order_by(Loan.created_at.desc())
    result = await db.execute(stmt)
    loans = result.scalars().all()

    return success_response(data=[
        {
            "id": str(l.id),
            "requested_amount": l.principal,
            "total_repayable": l.total_due,
            "balance": l.outstanding_balance,
            "due_date": l.due_date.isoformat() if l.due_date else None,
            "status": l.status.value.upper()
        } for l in loans
    ])


@router.get("/eligibility")
async def loan_eligibility(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Returns borrower-level lending eligibility details for app calculators.
    Dynamic contract includes product eligibility, effective pricing, policy metadata,
    and performance snapshot for transparent backend-authoritative pricing.
    """
    loan_stmt = select(Loan).where(Loan.user_id == user.id).order_by(Loan.created_at.desc())
    loans = (await db.execute(loan_stmt)).scalars().all()
    active_loan = next((l for l in loans if l.status in {LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE}), None)

    pricing = await PricingPolicyService.evaluate_for_user(db, user)
    selected = pricing.get("selected_product")
    if not selected:
        return error_response(
            code="NO_ELIGIBLE_PRODUCT",
            message="No eligible loan product for this profile right now.",
            status_code=404,
        )

    return success_response(data={
        # Backward-compatible fields used by existing mobile calculators.
        "max_limit": selected["effective_max_limit"],
        "min_amount": selected["min_amount"],
        "interest_rate": float(selected["effective_interest_rate"]),
        "processing_fee": int((selected.get("fees") or {}).get("processing_fee", 0)),
        "tenor_range_days": {"min": selected["min_tenor"], "max": selected["max_tenor"]},

        # New policy-driven contract.
        "eligible_products": pricing.get("eligible_products", []),
        "ineligible_products": pricing.get("ineligible_products", []),
        "selected_product": selected,
        "effective_interest_rate": float(selected["effective_interest_rate"]),
        "pricing_reason_codes": pricing.get("pricing_reason_codes", []),
        "benefits": pricing.get("benefits", {}),
        "policy_version": pricing.get("policy_version"),
        "performance": pricing.get("performance"),

        # Existing guard fields.
        "has_active_loan": bool(active_loan),
        "active_loan_id": str(active_loan.id) if active_loan else None,
    })


@router.get("/workflow-state")
async def workflow_state(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Backend-authoritative onboarding/workflow checkpoint for resume/re-entry.
    Priority: unpaid/active loan guard > latest application status > null.
    """
    loan_stmt = select(Loan).where(Loan.user_id == user.id).order_by(Loan.created_at.desc())
    loans = (await db.execute(loan_stmt)).scalars().all()
    active_loan = next(
        (l for l in loans if l.status in {LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE}),
        None,
    )
    if active_loan:
        return success_response(
            data={
                "checkpoint": "complete",
                "workflow_status": active_loan.status.value,
                "has_active_loan": True,
                "active_loan_id": str(active_loan.id),
            }
        )

    app_stmt = (
        select(LoanApplication)
        .where(LoanApplication.user_id == user.id)
        .order_by(LoanApplication.created_at.desc())
        .limit(1)
    )
    latest_app = (await db.execute(app_stmt)).scalar_one_or_none()
    if latest_app:
        status_map = {
            LoanApplicationStatus.AGREEMENT_PENDING: "offer_ready",
            LoanApplicationStatus.AGREEMENT_SIGNED: "offer_accepted",
            LoanApplicationStatus.DISBURSE_PENDING: "disbursement_status",
            LoanApplicationStatus.DISBURSED: "disbursement_status",
            LoanApplicationStatus.ACTIVE: "complete",
            LoanApplicationStatus.PARTIALLY_REPAID: "complete",
            LoanApplicationStatus.FULLY_REPAID: "complete",
            LoanApplicationStatus.OVERDUE: "complete",
        }
        return success_response(
            data={
                "checkpoint": status_map.get(latest_app.status),
                "workflow_status": latest_app.status.value,
                "application_id": str(latest_app.id),
                "has_active_loan": False,
            }
        )

    return success_response(
        data={
            "checkpoint": None,
            "workflow_status": None,
            "has_active_loan": False,
        }
    )


@router.get("/products", response_model=list[LoanProductResponse])
async def list_products(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Return all active loan products."""
    stmt = select(LoanProduct).where(LoanProduct.is_active == True)
    result = await db.execute(stmt)
    products = result.scalars().all()

    res = []
    for p in products:
        example_interest = int(10000 * p.interest_rate)
        res.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "min_amount": p.min_amount,
            "max_amount": p.max_amount,
            "min_tenor": p.min_tenor,
            "max_tenor": p.max_tenor,
            "interest_rate": p.interest_rate,
            "example_repayment": f"\u20A6{10000 + example_interest:,} (Principal: \u20A610k)"
        })
    return res


@router.post("/apply", response_model=LoanApplicationResponse)
async def apply_for_loan(
    data: LoanApplicationRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    logger.info(
        "onboarding_submit_attempt user_id=%s amount=%s tenor=%s purpose=%s",
        user.id, data.requested_amount, data.tenor, data.purpose
    )

    stmt = select(KycRecord).where(KycRecord.user_id == user.id)
    res = await db.execute(stmt)
    kyc = res.scalar_one_or_none()
    selfie_verified = bool(kyc and kyc.selfie_score and float(kyc.selfie_score) >= 0.8)
    if not kyc or not kyc.bvn_verified or not selfie_verified:
        logger.warning("onboarding_submit_blocked user_id=%s reason=kyc_incomplete", user.id)
        return error_response(code="KYC_INCOMPLETE", message="KYC incomplete. Please verify your identity first.", status_code=403)

    stmt = select(Loan).where(Loan.user_id == user.id, Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.PARTIALLY_REPAID, LoanStatus.OVERDUE]))
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        return error_response(code="ACTIVE_LOAN_EXISTS", message="ACTIVE_LOAN_EXISTS: You already have an active loan.", status_code=400)

    pricing = await PricingPolicyService.evaluate_for_user(db, user)
    selected_product = pricing.get("selected_product")

    if data.product_id:
        stmt = select(LoanProduct).where(LoanProduct.id == data.product_id, LoanProduct.is_active == True)
    else:
        if not selected_product:
            return error_response(code="NO_ELIGIBLE_PRODUCT", message="No eligible loan product for this profile right now.", status_code=404)
        stmt = select(LoanProduct).where(LoanProduct.id == uuid.UUID(selected_product["id"]), LoanProduct.is_active == True).limit(1)

    res = await db.execute(stmt)
    product = res.scalar_one_or_none()
    if not product:
        return error_response(code="NO_ACTIVE_PRODUCT", message="No active loan products available.", status_code=404)

    effective_cap = selected_product["effective_max_limit"] if selected_product and str(product.id) == selected_product["id"] else product.max_amount
    if not (product.min_amount <= data.requested_amount <= effective_cap):
        return error_response(code="AMOUNT_OUT_OF_RANGE", message=f"Amount must be between \u20A6{product.min_amount:,} and \u20A6{effective_cap:,}", status_code=400)

    if not (product.min_tenor <= data.tenor <= product.max_tenor):
        return error_response(code="TENOR_OUT_OF_RANGE", message=f"Tenor must be between {product.min_tenor} and {product.max_tenor} days", status_code=400)

    application = LoanApplication(
        user_id=user.id,
        product_id=product.id,
        requested_amount=data.requested_amount,
        approved_amount=data.requested_amount,
        tenor=data.tenor,
        purpose=data.purpose,
        status=LoanApplicationStatus.AGREEMENT_PENDING
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    logger.info("onboarding_submit_success user_id=%s application_id=%s", user.id, application.id)

    return success_response(data={
        "id": str(application.id),
        "status": LoanApplicationStatus.AGREEMENT_PENDING.value,
        "message": "Application approved. Review and accept your agreement."
    })


@router.get("/agreement/{application_id}")
async def get_agreement(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Fetch the generated agreement for a loan."""
    stmt = select(LoanApplication).where(LoanApplication.id == application_id, LoanApplication.user_id == user.id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status != LoanApplicationStatus.AGREEMENT_PENDING:
        raise HTTPException(status_code=400, detail="No agreement available for this application status")

    content = await AgreementService.generate_agreement(db, application_id)

    product_stmt = select(LoanProduct).where(LoanProduct.id == app.product_id)
    product = (await db.execute(product_stmt)).scalar_one()
    principal = app.approved_amount or app.requested_amount
    interest_amount = int(principal * float(product.interest_rate))
    processing_fee = int((product.fees or {}).get("processing_fee", 0))

    return success_response(data={
        "agreement_html": f"<pre>{content}</pre>",
        "fees_breakdown": {
            "principal": principal,
            "interest": interest_amount,
            "processing_fee": processing_fee,
            "total_repayable": principal + interest_amount + processing_fee,
        },
        "interest_rate": float(product.interest_rate),
        "tenor_days": app.tenor,
    })


@router.post("/accept-agreement/{application_id}")
async def accept_agreement(
    application_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    async def _accepted_response(application: LoanApplication, loan: Loan | None):
        schedules = []
        if loan:
            schedule_stmt = (
                select(RepaymentSchedule)
                .where(RepaymentSchedule.loan_id == loan.id)
                .order_by(RepaymentSchedule.installment_no.asc())
            )
            schedule_rows = (await db.execute(schedule_stmt)).scalars().all()
            schedules = [
                {
                    "installment_no": row.installment_no,
                    "due_date": row.due_date.isoformat(),
                    "amount_due": row.amount_due,
                    "status": str(row.status).upper(),
                }
                for row in schedule_rows
            ]
        return success_response(
            message="Agreement already accepted. Disbursement is being processed.",
            data={
                "loan_id": str(loan.id) if loan else None,
                "application_id": str(application.id),
                "application_status": application.status.value,
                "repayment_schedule": schedules,
            },
        )

    stmt = select(LoanApplication).where(LoanApplication.id == application_id, LoanApplication.user_id == user.id)
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.status in {LoanApplicationStatus.AGREEMENT_SIGNED, LoanApplicationStatus.DISBURSE_PENDING, LoanApplicationStatus.DISBURSED}:
        existing_loan_stmt = select(Loan).where(Loan.application_id == app.id)
        existing_loan = (await db.execute(existing_loan_stmt)).scalar_one_or_none()
        return await _accepted_response(app, existing_loan)

    if app.status != LoanApplicationStatus.AGREEMENT_PENDING:
        raise HTTPException(status_code=400, detail="Invalid application status for agreement acceptance")

    try:
        await StateMachine.transition(db, app, LoanApplicationStatus.AGREEMENT_SIGNED, user.id)

        consent = ConsentRecord(
            user_id=user.id,
            consent_type="loan_agreement",
            version="1.0",
            granted=True,
            ip_address=request.client.host if request.client else "0.0.0.0",
            source="api",
        )
        db.add(consent)

        product_stmt = select(LoanProduct).where(LoanProduct.id == app.product_id)
        product_res = await db.execute(product_stmt)
        product = product_res.scalar_one()

        principal = app.approved_amount or app.requested_amount
        interest = int(principal * float(product.interest_rate))
        processing_fee = int((product.fees or {}).get("processing_fee", 0))
        total_due = principal + interest + processing_fee

        existing_loan_stmt = select(Loan).where(Loan.application_id == app.id)
        existing_loan = (await db.execute(existing_loan_stmt)).scalar_one_or_none()
        if existing_loan:
            new_loan = existing_loan
        else:
            new_loan = Loan(
                application_id=app.id,
                user_id=user.id,
                principal=principal,
                interest=interest,
                fees=processing_fee,
                total_due=total_due,
                outstanding_balance=total_due,
                status=LoanStatus.ACTIVE
            )
            db.add(new_loan)
            await db.flush()

        schedule_stmt = select(RepaymentSchedule).where(RepaymentSchedule.loan_id == new_loan.id).limit(1)
        schedule = (await db.execute(schedule_stmt)).scalar_one_or_none()
        if not schedule:
            due_date = date.today() + timedelta(days=app.tenor)
            schedule = RepaymentSchedule(
                loan_id=new_loan.id,
                installment_no=1,
                due_date=due_date,
                amount_due=total_due,
                status="pending"
            )
            db.add(schedule)
            await db.flush()

        await StateMachine.transition(db, app, LoanApplicationStatus.DISBURSE_PENDING, user.id)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.warning("accept_agreement_integrity_race application_id=%s user_id=%s", app.id, user.id)
        app_refreshed = (await db.execute(stmt)).scalar_one_or_none() or app
        existing_loan = (await db.execute(select(Loan).where(Loan.application_id == app.id))).scalar_one_or_none()
        if existing_loan:
            return await _accepted_response(app_refreshed, existing_loan)
        return error_response(
            code="ACCEPTANCE_PERSISTENCE_RETRYABLE",
            message="Acceptance persistence is retryable. Please retry.",
            status_code=503,
        )
    except SQLAlchemyError:
        await db.rollback()
        logger.exception("accept_agreement_persistence_failed application_id=%s user_id=%s", app.id, user.id)
        return error_response(
            code="ACCEPTANCE_PERSISTENCE_RETRYABLE",
            message="Acceptance persistence is retryable. Please retry.",
            status_code=503,
        )
    return success_response(
        message="Agreement accepted. Disbursement is being processed.",
        data={
            "loan_id": str(new_loan.id),
            "application_id": str(app.id),
            "application_status": LoanApplicationStatus.DISBURSE_PENDING.value,
            "repayment_schedule": [
                {
                    "installment_no": schedule.installment_no,
                    "due_date": schedule.due_date.isoformat(),
                    "amount_due": schedule.amount_due,
                    "status": str(schedule.status).upper(),
                }
            ],
        }
    )


@router.post("/accept/{application_id}")
async def accept_offer_alias(
    application_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Alias endpoint to match mobile contract:
      POST /lending/loans/accept/:id
    """
    return await accept_agreement(
        application_id=application_id,
        request=request,
        db=db,
        user=user,
    )
