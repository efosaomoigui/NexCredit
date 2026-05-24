"""
Admin endpoints for pricing policy configuration with safe publish/activate flow.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth.deps import get_current_admin
from shared.database import get_db
from shared.models import PricingPolicyConfig, User, UserRole
from shared.response import success_response, error_response


router = APIRouter(prefix="/admin/pricing-policy", tags=["Admin Pricing Policy"])


class PricingPolicyPayload(BaseModel):
    version: str = Field(..., min_length=3, max_length=64)
    rate_multipliers: dict[str, float]
    limit_multipliers: dict[str, float]
    score_gates: dict[str, int] = Field(default_factory=dict)
    notes: str | None = None


def _serialize_policy(cfg: PricingPolicyConfig) -> dict:
    return {
        "id": str(cfg.id),
        "version": cfg.version,
        "status": cfg.status,
        "is_active": bool(cfg.is_active),
        "created_by": str(cfg.created_by) if cfg.created_by else None,
        "approved_by": str(cfg.approved_by) if cfg.approved_by else None,
        "config": cfg.config or {},
        "created_at": cfg.created_at.isoformat() if cfg.created_at else None,
        "updated_at": cfg.updated_at.isoformat() if cfg.updated_at else None,
    }


@router.get("/")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    rows = (await db.execute(select(PricingPolicyConfig).order_by(PricingPolicyConfig.created_at.desc()))).scalars().all()
    return success_response(data=[_serialize_policy(r) for r in rows])


@router.post("/draft")
async def create_draft(
    payload: PricingPolicyPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    exists = (await db.execute(select(PricingPolicyConfig).where(PricingPolicyConfig.version == payload.version))).scalar_one_or_none()
    if exists:
        return error_response(code="VERSION_EXISTS", message="Policy version already exists.", status_code=409)

    cfg = PricingPolicyConfig(
        version=payload.version,
        status="draft",
        is_active=False,
        created_by=admin.id,
        config={
            "rate_multipliers": payload.rate_multipliers,
            "limit_multipliers": payload.limit_multipliers,
            "score_gates": payload.score_gates,
            "notes": payload.notes,
        },
    )
    db.add(cfg)
    await db.commit()
    await db.refresh(cfg)
    return success_response(data=_serialize_policy(cfg))


@router.patch("/{version}")
async def update_draft(
    version: str,
    payload: PricingPolicyPayload,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    cfg = (await db.execute(select(PricingPolicyConfig).where(PricingPolicyConfig.version == version))).scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Policy version not found")
    if cfg.status != "draft":
        return error_response(code="INVALID_STATUS", message="Only draft policies can be edited.", status_code=400)

    cfg.config = {
        "rate_multipliers": payload.rate_multipliers,
        "limit_multipliers": payload.limit_multipliers,
        "score_gates": payload.score_gates,
        "notes": payload.notes,
    }
    await db.commit()
    await db.refresh(cfg)
    return success_response(data=_serialize_policy(cfg))


@router.post("/{version}/publish")
async def publish_policy(
    version: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    cfg = (await db.execute(select(PricingPolicyConfig).where(PricingPolicyConfig.version == version))).scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Policy version not found")
    if cfg.status not in {"draft", "published"}:
        return error_response(code="INVALID_STATUS", message="Only draft policies can be published.", status_code=400)
    cfg.status = "published"
    await db.commit()
    await db.refresh(cfg)
    return success_response(data=_serialize_policy(cfg))


@router.post("/{version}/activate")
async def activate_policy(
    version: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if admin.role != UserRole.SUPERADMIN:
        return error_response(code="FORBIDDEN", message="Only SuperAdmin can activate pricing policy.", status_code=403)

    cfg = (await db.execute(select(PricingPolicyConfig).where(PricingPolicyConfig.version == version))).scalar_one_or_none()
    if not cfg:
        raise HTTPException(status_code=404, detail="Policy version not found")
    if cfg.status != "published":
        return error_response(code="NOT_PUBLISHED", message="Policy must be published before activation.", status_code=400)
    if cfg.created_by and str(cfg.created_by) == str(admin.id):
        return error_response(code="FOUR_EYES_REQUIRED", message="Creator cannot activate the same policy version.", status_code=403)

    await db.execute(update(PricingPolicyConfig).values(is_active=False).where(PricingPolicyConfig.is_active == True))
    cfg.is_active = True
    cfg.status = "active"
    cfg.approved_by = admin.id
    await db.commit()
    await db.refresh(cfg)
    return success_response(data=_serialize_policy(cfg))


@router.get("/active")
async def get_active_policy(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    cfg = (await db.execute(select(PricingPolicyConfig).where(PricingPolicyConfig.is_active == True).limit(1))).scalar_one_or_none()
    if not cfg:
        return error_response(code="NO_ACTIVE_POLICY", message="No active pricing policy.", status_code=404)
    return success_response(data=_serialize_policy(cfg))
