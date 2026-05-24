"""
shared/encryption/aes.py
------------------------
AES-256-GCM field-level encryption for PII data at rest.

Used to encrypt sensitive fields before writing to the database:
  - BVN (Bank Verification Number)
  - NIN (National Identification Number)
  - Bank account numbers
  - Any other fields classified as PII

The 32-byte encryption key is loaded from AES_ENCRYPTION_KEY environment
variable (hex-encoded). NEVER hardcode the key.

Format of encrypted output:
  Base64( nonce[12] || ciphertext || tag[16] )

This allows the entire encrypted payload to be stored as a single string
column in PostgreSQL (TEXT or VARCHAR).
"""
from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# ---------------------------------------------------------------------------
# Key loading
# ---------------------------------------------------------------------------

def _load_key() -> bytes:
    """
    Load the AES-256 key from environment.

    The key must be a 64-character hex string (32 bytes = 256 bits).
    Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    """
    hex_key = os.getenv("AES_ENCRYPTION_KEY", "")
    if not hex_key:
        raise RuntimeError(
            "AES_ENCRYPTION_KEY environment variable is not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    try:
        key_bytes = bytes.fromhex(hex_key)
    except ValueError as exc:
        raise RuntimeError(
            "AES_ENCRYPTION_KEY must be a valid 64-character hex string."
        ) from exc

    if len(key_bytes) != 32:
        raise RuntimeError(
            f"AES_ENCRYPTION_KEY must decode to exactly 32 bytes (got {len(key_bytes)})."
        )
    return key_bytes


# ---------------------------------------------------------------------------
# Core encrypt / decrypt
# ---------------------------------------------------------------------------

_NONCE_SIZE = 12  # GCM standard: 96-bit nonce


def encrypt(plaintext: str) -> str:
    """
    Encrypt a plaintext string using AES-256-GCM.

    A fresh random 12-byte nonce is generated for every encryption call,
    guaranteeing that identical plaintexts produce different ciphertexts.

    Args:
        plaintext: The string to encrypt (e.g. a BVN value).

    Returns:
        Base64-encoded string containing nonce + ciphertext + GCM tag.
        Safe to store directly in a TEXT database column.
    """
    key = _load_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_SIZE)
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    payload = nonce + ciphertext_with_tag
    return base64.b64encode(payload).decode("utf-8")


def decrypt(encrypted_value: str) -> str:
    """
    Decrypt a value previously encrypted with :func:`encrypt`.

    Args:
        encrypted_value: Base64-encoded string from the database column.

    Returns:
        Original plaintext string.

    Raises:
        ValueError: If the payload is malformed or tampered with.
    """
    key = _load_key()
    aesgcm = AESGCM(key)
    try:
        raw = base64.b64decode(encrypted_value.encode("utf-8"))
    except Exception as exc:
        raise ValueError("Invalid base64 payload — cannot decrypt.") from exc

    if len(raw) < _NONCE_SIZE:
        raise ValueError("Encrypted payload is too short — data may be corrupted.")

    nonce = raw[:_NONCE_SIZE]
    ciphertext_with_tag = raw[_NONCE_SIZE:]

    try:
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, None)
    except Exception as exc:
        raise ValueError(
            "Decryption failed — payload may have been tampered with."
        ) from exc

    return plaintext_bytes.decode("utf-8")


# ---------------------------------------------------------------------------
# Convenience: encrypt only if not already encrypted (idempotent writes)
# ---------------------------------------------------------------------------

def encrypt_if_plain(value: str) -> str:
    """
    Encrypt a value only if it does not look like an already-encrypted payload.

    Useful in update operations where the field might already be encrypted.
    Detection heuristic: a valid encrypted payload is valid base64 and decodes
    to at least NONCE_SIZE bytes.
    """
    try:
        raw = base64.b64decode(value)
        if len(raw) > _NONCE_SIZE:
            # Looks encrypted — return as-is
            return value
    except Exception:
        pass
    return encrypt(value)
