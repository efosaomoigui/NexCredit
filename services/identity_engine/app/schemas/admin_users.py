"""
services/identity_engine/app/schemas/admin_users.py
---------------------------------------------------
Admin/staff user management schemas.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator, model_validator

from shared.models.users import UserRole, UserStatus


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    phone: str = Field(..., description="E.164 format Nigerian phone number (+234...)")
    password: str = Field(..., min_length=8)
    role: UserRole = Field(..., description="Staff role: agent/reviewer/admin/superadmin")
    display_name: Optional[str] = None
    department: Optional[str] = None

    @validator("email")
    def normalize_email(cls, v: str) -> str:
        return v.lower()

    @model_validator(mode="after")
    def ensure_staff_role(self):
        if self.role not in {UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN}:
            raise ValueError("role must be one of: agent, reviewer, admin, superadmin")
        return self


class AdminUserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    department: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = Field(default=None, min_length=8)

    @model_validator(mode="after")
    def ensure_staff_role_if_set(self):
        if self.role is not None and self.role not in {UserRole.AGENT, UserRole.REVIEWER, UserRole.ADMIN, UserRole.SUPERADMIN}:
            raise ValueError("role must be one of: agent, reviewer, admin, superadmin")
        return self
