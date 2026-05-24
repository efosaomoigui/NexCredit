from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.database import get_db
from shared.auth.jwt import TokenPayload
from shared.auth.rbac import require_authenticated, require_reviewer
from shared.models import User

async def get_current_user(
    payload: TokenPayload = Depends(require_authenticated),
    db: AsyncSession = Depends(get_db)
) -> User:
    stmt = select(User).where(User.id == payload.subject)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_admin(
    user: User = Depends(get_current_user),
    _ = Depends(require_reviewer)
) -> User:
    return user
