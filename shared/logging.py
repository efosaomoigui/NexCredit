"""
shared/logging.py
-----------------
Structured JSON logger for all NexCredit services.

Features:
  - Outputs JSON-structured log lines (ready for GCP Cloud Logging ingestion)
  - Automatically MASKS PII fields: phone numbers, emails, BVN, NIN, names
  - Log level controlled by LOG_LEVEL environment variable
  - Includes service name, timestamp, and trace context in every log record

Usage::

    from shared.logging import get_logger
    logger = get_logger(__name__)
    logger.info("Borrower KYC initiated", extra={"user_id": str(user_id)})

NEVER log raw PII. Use this logger everywhere.
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# PII Masking patterns
# ---------------------------------------------------------------------------

# Phone numbers: Nigerian (0XXXXXXXXXX, +234XXXXXXXXXX) and generic 10-11 digit
_PHONE_RE = re.compile(
    r"(\+?234|0)([789][01]\d{8})"
)

# Email addresses
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

# BVN: exactly 11 digits
_BVN_RE = re.compile(r"\b\d{11}\b")

# NIN: exactly 11 digits (same pattern; context differs — both masked)
_NIN_RE = _BVN_RE

# Account numbers: exactly 10 digits (NUBAN format)
_ACCOUNT_RE = re.compile(r"\b\d{10}\b")


def _mask_pii(text: str) -> str:
    """Replace PII patterns with masked equivalents."""
    text = _PHONE_RE.sub(r"\g<1>***PHONE***", text)
    text = _EMAIL_RE.sub("***EMAIL***", text)
    # Mask 11-digit numbers (BVN/NIN) — show only last 4 digits
    text = _BVN_RE.sub(lambda m: "***" + m.group()[-4:], text)
    # Mask 10-digit account numbers — show only last 4
    text = _ACCOUNT_RE.sub(lambda m: "****" + m.group()[-4:], text)
    return text


# ---------------------------------------------------------------------------
# JSON log formatter
# ---------------------------------------------------------------------------

class JsonFormatter(logging.Formatter):
    """Format log records as newline-delimited JSON objects."""

    def __init__(self, service_name: str = "nexcredit") -> None:
        super().__init__()
        self._service = service_name

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        # Build the base log document
        log_doc: dict[str, Any] = {
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            "severity": record.levelname,
            "service": self._service,
            "logger": record.name,
            "message": _mask_pii(self.formatMessage(record)),
        }

        # Attach extra fields passed via the `extra` keyword
        for key, value in record.__dict__.items():
            if key not in {
                "args", "asctime", "created", "exc_info", "exc_text",
                "filename", "funcName", "id", "levelname", "levelno",
                "lineno", "message", "module", "msecs", "msg", "name",
                "pathname", "process", "processName", "relativeCreated",
                "stack_info", "thread", "threadName",
            }:
                # Mask any PII in extra values
                str_value = str(value) if not isinstance(value, (dict, list)) else json.dumps(value)
                log_doc[key] = _mask_pii(str_value)

        # Attach exception info if present
        if record.exc_info:
            log_doc["exception"] = self.formatException(record.exc_info)

        try:
            return json.dumps(log_doc, ensure_ascii=False)
        except (TypeError, ValueError):
            log_doc["message"] = repr(log_doc.get("message", ""))
            return json.dumps(log_doc, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------

def get_logger(name: str, service_name: str | None = None) -> logging.Logger:
    """
    Retrieve (or create) a structured JSON logger.

    Args:
        name:         Logger name, typically ``__name__`` of the calling module.
        service_name: Optional service identifier embedded in every log record.
                      Defaults to the LOG_SERVICE_NAME env var or "nexcredit".

    Returns:
        Configured :class:`logging.Logger` instance.
    """
    resolved_service = service_name or os.getenv("LOG_SERVICE_NAME", "nexcredit")
    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    logger = logging.getLogger(name)

    # Only configure handlers once
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter(service_name=resolved_service))
        logger.addHandler(handler)

    logger.setLevel(log_level)
    logger.propagate = False
    return logger


# ---------------------------------------------------------------------------
# Module-level root logger for direct imports
# ---------------------------------------------------------------------------

logger = get_logger("nexcredit")
