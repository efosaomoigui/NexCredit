"""
shared/auth/rbac.py
-------------------
Role-Based Access Control: Role enum and FastAPI dependency for enforcing
role requirements at the endpoint level.

RBAC is enforced at TWO layers per AGENT.md:
  1. API Gateway middleware (validates JWT, extracts role)
  2. Individual service endpoints (uses require_role() dependency below)
"""
from __future__ import annotations

from enum import Enum

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared.auth.jwt import TokenPayload, verify_token

# ---------------------------------------------------------------------------
# Role Definitions
# ---------------------------------------------------------------------------

class Role(str, Enum):
    """
    Platform roles in ascending privilege order.

    borrower   → End user taking loans via the mobile app.
    agent      → Field agent onboarding borrowers (future phase).
    reviewer   → Back-office staff reviewing loan applications.
    admin      → Operations admin with broad management access.
    superadmin → Platform superadmin with override capabilities.
    """
    BORROWER   = "borrower"
    AGENT      = "agent"
    REVIEWER   = "reviewer"
    ADMIN      = "admin"
    SUPERADMIN = "superadmin"


# Privilege hierarchy: higher index = higher privilege
_ROLE_HIERARCHY: list[Role] = [
    Role.BORROWER,
    Role.AGENT,
    Role.REVIEWER,
    Role.ADMIN,
    Role.SUPERADMIN,
]


def role_rank(role: Role | str) -> int:
    """Return the privilege rank of a role (higher is more privileged)."""
    try:
        return _ROLE_HIERARCHY.index(Role(role))
    except ValueError:
        return -1


# ---------------------------------------------------------------------------
# FastAPI bearer extraction
# ---------------------------------------------------------------------------

_bearer_scheme = HTTPBearer(auto_error=False)


async def _get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenPayload:
    """
    Extract and verify the Bearer JWT from the Authorization header.
    Raises HTTP 401 if missing or invalid.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authorization header missing",
                    "field": None,
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return verify_token(credentials.credentials, expected_type="access")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": str(exc),
                    "field": None,
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# Role enforcement dependency factory
# ---------------------------------------------------------------------------

def require_role(*allowed_roles: Role):
    """
    FastAPI dependency factory that enforces role-based access.

    Usage::

        @router.post("/approve-loan")
        async def approve_loan(
            payload: TokenPayload = Depends(require_role(Role.REVIEWER, Role.ADMIN, Role.SUPERADMIN))
        ):
            ...

    Accepts any role listed in `allowed_roles`. Also accepts any role that
    outranks the highest role in `allowed_roles` (privilege inheritance).

    Args:
        *allowed_roles: One or more Role enum values that are permitted.

    Returns:
        FastAPI dependency that resolves to TokenPayload on success.
    """
    min_rank = min(role_rank(r) for r in allowed_roles) if allowed_roles else 0

    async def dependency(
        payload: TokenPayload = Depends(_get_token_payload),
    ) -> TokenPayload:
        caller_rank = role_rank(payload.role)
        caller_role = Role(payload.role) if payload.role in [r.value for r in Role] else None

        # Allow if explicitly listed OR if caller outranks the minimum required role
        if caller_role in allowed_roles or caller_rank >= min_rank:
            return payload

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {
                    "code": "FORBIDDEN",
                    "message": (
                        f"Role '{payload.role}' is not permitted to access this resource. "
                        f"Required: {[r.value for r in allowed_roles]}"
                    ),
                    "field": None,
                },
            },
        )

    return dependency


# ---------------------------------------------------------------------------
# Convenience pre-built dependencies
# ---------------------------------------------------------------------------

# Any authenticated user
require_authenticated = require_role(*list(Role))

# Internal staff and above
require_reviewer    = require_role(Role.REVIEWER, Role.ADMIN, Role.SUPERADMIN)
require_admin       = require_role(Role.ADMIN, Role.SUPERADMIN)
require_superadmin  = require_role(Role.SUPERADMIN)
