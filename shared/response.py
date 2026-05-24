"""
shared/response.py
------------------
Standard API response envelope for all NexCredit services.

All endpoints MUST return one of these two shapes:

  Success: { "success": true,  "data": {...}, "message": "...", "meta": {...} }
  Error:   { "success": false, "error": {"code": "...", "message": "...", "field": null} }
"""
from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Success helpers
# ---------------------------------------------------------------------------

def success_response(
    data: Any = None,
    message: str = "Operation successful",
    meta: dict[str, Any] | None = None,
    status_code: int = 200,
) -> JSONResponse:
    """Return a standardised success envelope."""
    body: dict[str, Any] = {
        "success": True,
        "data": data,
        "message": message,
    }
    if meta is not None:
        body["meta"] = meta
    return JSONResponse(content=body, status_code=status_code)


def created_response(
    data: Any = None,
    message: str = "Resource created",
) -> JSONResponse:
    """Convenience wrapper for HTTP 201 Created."""
    return success_response(data=data, message=message, status_code=201)


# ---------------------------------------------------------------------------
# Error helpers
# ---------------------------------------------------------------------------

def error_response(
    code: str,
    message: str,
    field: str | None = None,
    status_code: int = 400,
) -> JSONResponse:
    """Return a standardised error envelope."""
    body: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "field": field,
        },
    }
    return JSONResponse(content=body, status_code=status_code)


def not_found_response(resource: str = "Resource") -> JSONResponse:
    return error_response(
        code="NOT_FOUND",
        message=f"{resource} not found",
        status_code=404,
    )


def unauthorized_response(message: str = "Authentication required") -> JSONResponse:
    return error_response(
        code="UNAUTHORIZED",
        message=message,
        status_code=401,
    )


def forbidden_response(message: str = "Insufficient permissions") -> JSONResponse:
    return error_response(
        code="FORBIDDEN",
        message=message,
        status_code=403,
    )


def validation_error_response(field: str, message: str) -> JSONResponse:
    return error_response(
        code="VALIDATION_ERROR",
        message=message,
        field=field,
        status_code=422,
    )


def internal_error_response(message: str = "An unexpected error occurred") -> JSONResponse:
    return error_response(
        code="INTERNAL_ERROR",
        message=message,
        status_code=500,
    )
