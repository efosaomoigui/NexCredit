"""
services/identity_engine/app/schemas/assignments.py
---------------------------------------------------
Schemas for agent/borrower assignment management.
"""

from __future__ import annotations

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class AssignmentCreateRequest(BaseModel):
    agent_id: uuid.UUID = Field(..., description="User id of the collections agent")
    borrower_id: uuid.UUID = Field(..., description="User id of the borrower")


class AssignmentDeleteRequest(BaseModel):
    agent_id: uuid.UUID
    borrower_id: uuid.UUID


class BorrowerListItem(BaseModel):
    user_id: uuid.UUID
    phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    status: str

