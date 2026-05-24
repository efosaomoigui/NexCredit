"""
services/identity_engine/app/schemas/auth.py
--------------------------------------------
Pydantic schemas for authentication requests and responses.
"""
from typing import Optional
import uuid
from pydantic import BaseModel, EmailStr, Field, validator, model_validator
import re

class UserBase(BaseModel):
    phone: str = Field(..., description="Phone number in E.164 format (+234...)")
    email: Optional[EmailStr] = None

    @validator("phone")
    def validate_phone(cls, v):
        if not re.match(r"^\+234\d{10,11}$", v):
            raise ValueError("Phone number must be in E.164 format with +234 prefix")
        return v

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class OTPVerify(BaseModel):
    identifier: str
    otp_code: str = Field(..., min_length=6, max_length=6)

class LoginRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    otp_channel: Optional[str] = Field(default="sms")

    @model_validator(mode="after")
    def require_identifier(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")
        return self

class StaffLoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def require_identifier(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")
        return self

    @validator("phone")
    def validate_staff_phone(cls, v):
        if v is None:
            return v
        if not re.match(r"^\+234\d{10,11}$", v):
            raise ValueError("Phone number must be in E.164 format with +234 prefix")
        return v

    @validator("email")
    def normalize_email(cls, v):
        return v.lower() if v else v

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(UserBase):
    id: uuid.UUID
    role: str
    status: str

    class Config:
        from_attributes = True
