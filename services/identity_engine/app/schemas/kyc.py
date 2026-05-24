"""
services/identity_engine/app/schemas/kyc.py
-------------------------------------------
Pydantic schemas for KYC submission and status.
"""
from typing import Optional, Any
from pydantic import BaseModel, Field

class BvnVerifyRequest(BaseModel):
    bvn: str = Field(..., min_length=11, max_length=11)

class NinVerifyRequest(BaseModel):
    nin: str = Field(..., min_length=11, max_length=11)

class BankAccountRequest(BaseModel):
    account_number: str = Field(..., min_length=10, max_length=10)
    bank_code: str

class PersonalInfoRequest(BaseModel):
    fullName: str
    dob: str
    gender: str
    address: str
    marital: Optional[str] = None

class EmploymentInfoRequest(BaseModel):
    empType: str
    employer: str
    income: str
    salaryDate: str

class KycStatusResponse(BaseModel):
    user_id: str
    bvn_verified: bool
    nin_verified: bool
    selfie_verified: bool
    bank_account_verified: bool
    identity_score: float
    can_apply: bool
    steps: dict[str, str] # e.g. {"bvn": "completed", "nin": "pending"}

class AdminOverrideRequest(BaseModel):
    reason: str
    status: str = "verified"
