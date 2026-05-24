"""
services/lending_engine/app/schemas/loans.py
--------------------------------------------
Pydantic schemas for loan products and applications.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from decimal import Decimal
import uuid

class LoanProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    min_amount: int
    max_amount: int
    min_tenor: int
    max_tenor: int
    interest_rate: Decimal
    example_repayment: str

    class Config:
        from_attributes = True

class LoanApplicationRequest(BaseModel):
    product_id: Optional[uuid.UUID] = None
    requested_amount: int = Field(..., gt=0)
    tenor: int = Field(..., gt=0)
    purpose: Optional[str] = None

class LoanApplicationResponse(BaseModel):
    id: uuid.UUID
    status: str
    message: str

class LoanReviewRequest(BaseModel):
    decision_notes: str
    approved_amount: Optional[int] = None
