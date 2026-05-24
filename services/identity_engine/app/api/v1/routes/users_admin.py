"""
services/identity_engine/app/api/v1/routes/users_admin.py
---------------------------------------------------------
Admin endpoints for managing staff users (agents/reviewers/admins).

MVP scope:
- Create staff users
- List staff users
- Update staff user role/status/profile
"""

from __future__ import annotations

from datetime import datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth.rbac import require_admin
from shared.auth.jwt import TokenPayload
from shared.database import get_db
from shared.models import AdminUser, AuditLog, User, UserRole
from shared.response import error_response, success_response
from services.identity_engine.app.schemas.admin_users import (
    AdminUserCreateRequest,
    AdminUserUpdateRequest,
)

router = APIRouter(prefix="/admin/users", tags=["Admin Users"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _is_staff_role(role: UserRole) -> bool:
    return role in {UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN}


@router.get("")
async def list_staff_users(
    db: AsyncSession = Depends(get_db),
    payload: TokenPayload = Depends(require_admin),
):
    stmt = (
        select(User, AdminUser)
        .join(AdminUser, AdminUser.user_id == User.id)
        .where(User.role.in_([UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN]))
        .order_by(User.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()
    data = []
    for user, admin_profile in rows:
        data.append(
            {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "status": user.status.value,
                "display_name": admin_profile.display_name,
                "department": admin_profile.department,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )
    return success_response(data={"users": data})


@router.post("")
async def create_staff_user(
    body: AdminUserCreateRequest,
    db: AsyncSession = Depends(get_db),
    payload: TokenPayload = Depends(require_admin),
):
    # Avoid duplicates (email or phone)
    existing_stmt = select(User).where((User.email == body.email) | (User.phone == body.phone))
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        return error_response(message="A user with this email or phone already exists", status_code=409)

    if not _is_staff_role(body.role):
        return error_response(message="Invalid staff role", status_code=400)

    user = User(
        phone=body.phone,
        email=body.email,
        password_hash=_hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()

    admin_profile = AdminUser(
        user_id=user.id,
        display_name=body.display_name,
        role=body.role,
        department=body.department,
        is_active=True,
        last_login_at=None,
    )
    db.add(admin_profile)

    db.add(
        AuditLog(
            actor_id=payload.subject,
            actor_type="admin",
            action="user.staff_created",
            entity_type="users",
            entity_id=user.id,
            diff={"after": {"role": body.role.value, "email": body.email}},
        )
    )

    await db.commit()
    await db.refresh(user)

    return success_response(
        data={
            "user": {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "status": user.status.value,
            }
        },
        message="Staff user created",
    )


@router.patch("/{user_id}")
async def update_staff_user(
    user_id: uuid.UUID,
    body: AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    payload: TokenPayload = Depends(require_admin),
):
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not _is_staff_role(user.role):
        return error_response(message="Only staff users can be updated here", status_code=400)

    admin_stmt = select(AdminUser).where(AdminUser.user_id == user.id)
    admin_profile = (await db.execute(admin_stmt)).scalar_one_or_none()
    if not admin_profile:
        # Should not happen, but keep system consistent
        admin_profile = AdminUser(user_id=user.id, role=user.role, is_active=True)
        db.add(admin_profile)
        await db.flush()

    before = {"role": user.role.value, "status": user.status.value}

    if body.role is not None:
        user.role = body.role
        admin_profile.role = body.role
    if body.status is not None:
        user.status = body.status
        admin_profile.is_active = body.status.value == "active"
    if body.password is not None:
        user.password_hash = _hash_password(body.password)
    if body.display_name is not None:
        admin_profile.display_name = body.display_name
    if body.department is not None:
        admin_profile.department = body.department

    db.add(
        AuditLog(
            actor_id=payload.subject,
            actor_type="admin",
            action="user.staff_updated",
            entity_type="users",
            entity_id=user.id,
            diff={"before": before, "after": {"role": user.role.value, "status": user.status.value}},
        )
    )

    await db.commit()

    return success_response(
        data={
            "user": {
                "id": str(user.id),
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "status": user.status.value,
                "display_name": admin_profile.display_name,
                "department": admin_profile.department,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        message="Staff user updated",
    )
