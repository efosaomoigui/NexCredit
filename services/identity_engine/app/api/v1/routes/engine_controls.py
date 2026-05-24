"""
services/identity_engine/app/api/v1/routes/engine_controls.py
------------------------------------------------------------
Admin endpoints to view and update platform engine controls.

These are persisted in Postgres and audit-logged.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth.jwt import TokenPayload
from shared.auth.rbac import require_admin
from shared.database import get_db
from shared.models import AuditLog, EngineControl
from shared.response import error_response, success_response

from services.identity_engine.app.schemas.engine_controls import (
    EngineControlItem,
    EngineControlUpdateRequest,
)

router = APIRouter(prefix="/admin/engine-controls", tags=["Admin Settings"])


ENGINE_KEYS: list[str] = [
    "identity_engine",
    "risk_engine",
    "lending_engine",
    "payment_engine",
    "collections_engine",
    "notification_engine",
    "ai_engine",
    "compliance_engine",
    "crm_engine",
]


@router.get("")
async def list_engine_controls(
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_admin),
):
    """
    Return engine controls for known engines.

    Default behavior: if an engine has no row yet, create it as enabled.
    """
    existing = (await db.execute(select(EngineControl))).scalars().all()
    by_key = {e.engine_key: e for e in existing}

    created_any = False
    for key in ENGINE_KEYS:
        if key in by_key:
            continue
        ec = EngineControl(engine_key=key, is_enabled=True)
        db.add(ec)
        by_key[key] = ec
        created_any = True

    if created_any:
        await db.commit()

    data: list[EngineControlItem] = [
        EngineControlItem(engine_key=key, is_enabled=bool(by_key[key].is_enabled)) for key in ENGINE_KEYS
    ]
    return success_response(data={"engines": [d.model_dump() for d in data]})


@router.put("/{engine_key}")
async def update_engine_control(
    engine_key: str,
    body: EngineControlUpdateRequest,
    db: AsyncSession = Depends(get_db),
    payload: TokenPayload = Depends(require_admin),
):
    if engine_key not in ENGINE_KEYS:
        return error_response(message="Unknown engine_key", status_code=400)

    ec = (await db.execute(select(EngineControl).where(EngineControl.engine_key == engine_key))).scalar_one_or_none()
    if not ec:
        ec = EngineControl(engine_key=engine_key, is_enabled=True)
        db.add(ec)
        await db.commit()
        await db.refresh(ec)

    before = bool(ec.is_enabled)
    ec.is_enabled = bool(body.is_enabled)

    audit = AuditLog(
        actor_id=payload.subject,
        actor_type="admin",
        action="system.engine_controls.update",
        entity_type="engine_controls",
        entity_id=ec.id,
        notes=body.reason,
        diff={"before": {"is_enabled": before}, "after": {"is_enabled": bool(ec.is_enabled)}, "engine_key": engine_key},
    )
    db.add(audit)

    await db.commit()

    return success_response(data={"engine": {"engine_key": ec.engine_key, "is_enabled": bool(ec.is_enabled)}}, message="Updated")

