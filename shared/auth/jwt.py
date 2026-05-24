"""
shared/auth/jwt.py
------------------
JWT creation and verification using RS256 (asymmetric RSA key pair).

Private key signs tokens (held by auth service only).
Public key verifies tokens (shared with all services).

Keys are loaded from environment variables — never hardcoded.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from shared.response import unauthorized_response

def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _algorithm() -> str:
    return _env("JWT_ALGORITHM", "HS256").upper()


def _load_pem(env_var: str) -> str:
    """Load a PEM key from env, replacing literal \\n with newlines."""
    value = _env(env_var, "")
    if not value or "REPLACE_WITH_YOUR" in value:
        raise RuntimeError(f"Missing/placeholder env var: {env_var}")
    return value.replace("\\n", "\n")


def _get_hs256_secret() -> str:
    secret = _env("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("Missing required environment variable: JWT_SECRET")
    return secret


def _get_private_key() -> str:
    return _load_pem("JWT_PRIVATE_KEY")


def _get_public_key() -> str:
    return _load_pem("JWT_PUBLIC_KEY")


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def create_access_token(
    subject: str,
    role: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject:      User UUID (string form).
        role:         User role string (e.g. "borrower", "admin").
        extra_claims: Optional additional claims to embed (e.g. tenant_id).

    Returns:
        Signed JWT string.
    """
    ttl_seconds = int(os.getenv("ACCESS_TOKEN_TTL", "900"))
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "jti": str(uuid.uuid4()),   # Unique token ID for revocation support
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    alg = _algorithm()
    key = _get_hs256_secret() if alg == "HS256" else _get_private_key()
    return jwt.encode(payload, key, algorithm=alg)


def create_refresh_token(subject: str, role: str) -> str:
    """
    Create a long-lived refresh token.

    Args:
        subject: User UUID.
        role:    User role.

    Returns:
        Signed JWT refresh token string.
    """
    ttl_seconds = int(os.getenv("REFRESH_TOKEN_TTL", "604800"))
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
        "type": "refresh",
    }
    alg = _algorithm()
    key = _get_hs256_secret() if alg == "HS256" else _get_private_key()
    return jwt.encode(payload, key, algorithm=alg)


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

class TokenPayload:
    """Parsed and validated JWT payload."""

    def __init__(self, raw: dict[str, Any]) -> None:
        self.subject: str = raw["sub"]
        self.role: str = raw["role"]
        self.jti: str = raw.get("jti", "")
        self.token_type: str = raw.get("type", "access")
        self.issued_at: datetime = datetime.fromtimestamp(raw["iat"], tz=timezone.utc)
        self.expires_at: datetime = datetime.fromtimestamp(raw["exp"], tz=timezone.utc)
        self._raw = raw

    def get(self, key: str, default: Any = None) -> Any:
        return self._raw.get(key, default)


def verify_token(token: str, expected_type: str = "access") -> TokenPayload:
    """
    Verify and decode a JWT token.

    Args:
        token:         Raw JWT string (without 'Bearer ' prefix).
        expected_type: 'access' or 'refresh'.

    Returns:
        TokenPayload on success.

    Raises:
        ValueError on any verification failure (expired, invalid, wrong type).
    """
    try:
        alg = _algorithm()
        key = _get_hs256_secret() if alg == "HS256" else _get_public_key()
        raw = jwt.decode(token, key, algorithms=[alg])
    except ExpiredSignatureError:
        raise ValueError("Token has expired")
    except JWTError as exc:
        raise ValueError(f"Invalid token: {exc}") from exc

    payload = TokenPayload(raw)

    if payload.token_type != expected_type:
        raise ValueError(
            f"Invalid token type: expected '{expected_type}', got '{payload.token_type}'"
        )

    return payload
