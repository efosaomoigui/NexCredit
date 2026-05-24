"""
services/identity_engine/app/api/v1/routes/assignments.py
---------------------------------------------------------
Assignment APIs:
- Admins can assign borrowers to agents
- Agents can fetch their assigned borrowers ("My Queue")
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth.jwt import TokenPayload
from shared.auth.rbac import Role, require_admin, require_role
from shared.database import get_db
from shared.models import AgentAssignment, BorrowerProfile, User, UserRole, UserStatus
from shared.response import error_response, success_response
from services.identity_engine.app.schemas.assignments import (
    AssignmentCreateRequest,
    AssignmentDeleteRequest,
)

router = APIRouter(prefix="", tags=["Assignments"])


def _staff_roles() -> set[UserRole]:
    return {UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN}


@router.get("/admin/borrowers")
async def admin_list_borrowers(
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_admin),
):
    stmt = (
        select(User, BorrowerProfile)
        .outerjoin(BorrowerProfile, BorrowerProfile.user_id == User.id)
        .where(User.role == UserRole.BORROWER)
        .order_by(User.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    borrowers = []
    for user, profile in rows:
        borrowers.append(
            {
                "user_id": str(user.id),
                "phone": user.phone,
                "email": user.email,
                "full_name": profile.full_name if profile else None,
                "status": user.status.value,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )
    return success_response(data={"borrowers": borrowers})


@router.get("/admin/assignments")
async def admin_list_assignments(
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_admin),
):
    stmt = select(AgentAssignment).where(AgentAssignment.is_active == True)  # noqa: E712
    rows = (await db.execute(stmt)).scalars().all()
    return success_response(
        data={
            "assignments": [
                {"id": str(a.id), "agent_id": str(a.agent_id), "borrower_id": str(a.borrower_id), "is_active": a.is_active}
                for a in rows
            ]
        }
    )


@router.post("/admin/assignments")
async def admin_create_assignment(
    body: AssignmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_admin),
):
    agent = (await db.execute(select(User).where(User.id == body.agent_id))).scalar_one_or_none()
    borrower = (await db.execute(select(User).where(User.id == body.borrower_id))).scalar_one_or_none()

    if not agent or agent.role != UserRole.AGENT:
        return error_response(message="agent_id must be a valid agent user", status_code=400)
    if not borrower or borrower.role != UserRole.BORROWER:
        return error_response(message="borrower_id must be a valid borrower user", status_code=400)
    if agent.status != UserStatus.ACTIVE:
        return error_response(message="agent account is not active", status_code=400)

    existing = (
        await db.execute(
            select(AgentAssignment).where(
                (AgentAssignment.agent_id == body.agent_id) & (AgentAssignment.borrower_id == body.borrower_id)
            )
        )
    ).scalar_one_or_none()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            await db.commit()
        return success_response(
            data={"assignment": {"id": str(existing.id), "agent_id": str(existing.agent_id), "borrower_id": str(existing.borrower_id)}},
            message="Already assigned",
        )

    assignment = AgentAssignment(agent_id=body.agent_id, borrower_id=body.borrower_id, is_active=True)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return success_response(
        data={"assignment": {"id": str(assignment.id), "agent_id": str(assignment.agent_id), "borrower_id": str(assignment.borrower_id)}},
        message="Assigned",
    )


@router.delete("/admin/assignments")
async def admin_delete_assignment(
    body: AssignmentDeleteRequest,
    db: AsyncSession = Depends(get_db),
    _: TokenPayload = Depends(require_admin),
):
    stmt = select(AgentAssignment).where(
        (AgentAssignment.agent_id == body.agent_id) & (AgentAssignment.borrower_id == body.borrower_id)
    )
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    if not assignment:
        return success_response(message="Not assigned")

    # soft delete for history
    assignment.is_active = False
    await db.commit()
    return success_response(message="Unassigned")


@router.get("/assignments/me")
async def my_assignments(
    db: AsyncSession = Depends(get_db),
    payload: TokenPayload = Depends(require_role(Role.AGENT, Role.ADMIN, Role.SUPERADMIN)),
):
    stmt = (
        select(AgentAssignment, User, BorrowerProfile)
        .join(User, User.id == AgentAssignment.borrower_id)
        .outerjoin(BorrowerProfile, BorrowerProfile.user_id == User.id)
        .where(AgentAssignment.is_active == True)  # noqa: E712
        .where(AgentAssignment.agent_id == payload.subject)
        .order_by(AgentAssignment.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    borrowers = []
    for assignment, borrower_user, profile in rows:
        borrowers.append(
            {
                "assignment_id": str(assignment.id),
                "borrower_id": str(borrower_user.id),
                "full_name": profile.full_name if profile else None,
                "phone": borrower_user.phone,
                "email": borrower_user.email,
                "status": borrower_user.status.value,
            }
        )
    return success_response(data={"borrowers": borrowers})
