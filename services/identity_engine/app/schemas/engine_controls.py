"""
services/identity_engine/app/schemas/engine_controls.py
------------------------------------------------------
Schemas for platform engine enable/disable controls.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class EngineControlItem(BaseModel):
    engine_key: str
    is_enabled: bool


class EngineControlUpdateRequest(BaseModel):
    is_enabled: bool = Field(..., description="Enable/disable the engine")
    reason: str | None = Field(default=None, description="Why this change was made (stored in audit logs)")

