"""
Tests for shared/encryption/aes.py — AES-256-GCM field encryption.
"""
import os

import pytest


class TestAesEncryption:
    """Tests for AES-256-GCM encrypt/decrypt utility."""

    @pytest.fixture(autouse=True)
    def set_aes_key(self, monkeypatch):
        # Use a deterministic 32-byte test key
        test_key = "0" * 64  # 64 hex chars = 32 bytes
        monkeypatch.setenv("AES_ENCRYPTION_KEY", test_key)

    def test_encrypt_returns_string(self):
        from shared.encryption.aes import encrypt
        result = encrypt("22212345678")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_decrypt_roundtrip(self):
        from shared.encryption.aes import decrypt, encrypt
        plaintext = "22212345678"  # BVN-like value
        encrypted = encrypt(plaintext)
        assert decrypt(encrypted) == plaintext

    def test_different_ciphertexts_for_same_plaintext(self):
        """Each encryption call must produce a unique ciphertext (random nonce)."""
        from shared.encryption.aes import encrypt
        plaintext = "sensitive_nin_value"
        c1 = encrypt(plaintext)
        c2 = encrypt(plaintext)
        assert c1 != c2

    def test_decrypt_raises_on_tampered_data(self):
        from shared.encryption.aes import decrypt, encrypt
        encrypted = encrypt("real_value")
        # Corrupt the ciphertext
        corrupted = encrypted[:-4] + "XXXX"
        with pytest.raises(ValueError):
            decrypt(corrupted)

    def test_decrypt_raises_on_invalid_base64(self):
        from shared.encryption.aes import decrypt
        with pytest.raises(ValueError, match="Invalid base64"):
            decrypt("not_valid_base64!!!")

    def test_missing_key_raises(self, monkeypatch):
        monkeypatch.delenv("AES_ENCRYPTION_KEY", raising=False)
        with pytest.raises(RuntimeError, match="AES_ENCRYPTION_KEY"):
            from importlib import reload
            import shared.encryption.aes as aes_module
            reload(aes_module)
            aes_module.encrypt("test")


class TestPiiMasking:
    """Validate the PII masking logger doesn't leak sensitive values."""

    @pytest.fixture(autouse=True)
    def set_log_level(self, monkeypatch):
        monkeypatch.setenv("LOG_LEVEL", "DEBUG")

    def test_phone_masked_in_log(self):
        from shared.logging import _mask_pii
        masked = _mask_pii("User phone: 08012345678 called in")
        assert "08012345678" not in masked
        assert "PHONE" in masked

    def test_email_masked_in_log(self):
        from shared.logging import _mask_pii
        masked = _mask_pii("Email: john.doe@example.com registered")
        assert "john.doe@example.com" not in masked
        assert "EMAIL" in masked

    def test_bvn_partially_masked(self):
        from shared.logging import _mask_pii
        bvn = "22212345678"
        masked = _mask_pii(f"BVN: {bvn}")
        assert bvn not in masked
        # Last 4 digits should still be visible
        assert "5678" in masked

    def test_clean_text_unchanged(self):
        from shared.logging import _mask_pii
        clean = "Loan application DRAFT submitted successfully"
        assert _mask_pii(clean) == clean
