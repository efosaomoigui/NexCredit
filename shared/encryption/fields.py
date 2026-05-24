"""
shared/encryption/fields.py
---------------------------
Custom SQLAlchemy TypeDecorator: EncryptedString

Wraps the AES-256-GCM utility from shared/encryption/aes.py to provide
transparent field-level encryption/decryption at the ORM layer.

Apply to columns that hold PII:
  - bank_accounts.account_number
  - kyc_records.bvn_hash
  - kyc_records.nin_hash

Usage::

    class BankAccount(Base, AuditableMixin):
        account_number: Mapped[str] = mapped_column(EncryptedString(length=512))

The stored value in PostgreSQL is the Base64 ciphertext.
The ORM layer automatically decrypts on read and encrypts on write.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import String, TypeDecorator

from shared.encryption.aes import decrypt, encrypt


class EncryptedString(TypeDecorator):  # type: ignore[type-arg]
    """
    SQLAlchemy TypeDecorator that transparently encrypts/decrypts string
    values using AES-256-GCM.

    The underlying database column is a VARCHAR/TEXT storing the
    Base64-encoded ciphertext (nonce + ciphertext + GCM tag).

    Args:
        length: Column length in characters. Default 512 accommodates the
                Base64 overhead of a typical encrypted short string.
                Increase for longer plaintexts.
    """

    # The backing SQL type
    impl = String
    cache_ok = True  # Safe to cache; encryption is stateless (key from env)

    def __init__(self, length: int = 512, *args: Any, **kwargs: Any) -> None:
        super().__init__(length, *args, **kwargs)

    # ------------------------------------------------------------------
    # ORM → Database (Python value → stored value)
    # ------------------------------------------------------------------

    def process_bind_param(self, value: str | None, dialect: Any) -> str | None:
        """Encrypt plaintext before writing to the database."""
        if value is None:
            return None
        if not isinstance(value, str):
            value = str(value)
        return encrypt(value)

    # ------------------------------------------------------------------
    # Database → ORM (stored value → Python value)
    # ------------------------------------------------------------------

    def process_result_value(self, value: str | None, dialect: Any) -> str | None:
        """Decrypt ciphertext when reading from the database."""
        if value is None:
            return None
        try:
            return decrypt(value)
        except ValueError:
            # Return raw value if decryption fails (e.g. legacy plaintext
            # during a migration window). Log a warning in production.
            return value

    # ------------------------------------------------------------------
    # Alembic rendering
    # ------------------------------------------------------------------

    def copy(self, **kwargs: Any) -> "EncryptedString":
        return EncryptedString(self.impl.length)
