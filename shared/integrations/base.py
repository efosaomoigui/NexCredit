"""
shared/integrations/base.py
---------------------------
Base classes and exceptions for external service adapters.
"""
from typing import Any, Protocol

class IntegrationError(Exception):
    """Custom exception for all third-party integration failures."""
    def __init__(self, provider: str, message: str, status_code: int = None, raw_response: Any = None):
        self.provider = provider
        self.message = message
        self.status_code = status_code
        self.raw_response = raw_response
        super().__init__(f"[{provider.upper()}] {message}")

class WebhookVerificationError(IntegrationError):
    """Raised when webhook signature verification fails."""
    pass
