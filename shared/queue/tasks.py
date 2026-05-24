"""
shared/queue/tasks.py
---------------------
Celery task definitions shared across services.

Individual engines define their own tasks in their own modules.
This file registers the Celery application instance and exposes
common infrastructure tasks (health ping, dead-letter logging).
"""
from __future__ import annotations

import os

from celery import Celery
from celery.schedules import crontab

# ---------------------------------------------------------------------------
# Celery application
# ---------------------------------------------------------------------------

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

celery_app = Celery(
    "nexcredit",
    broker=broker_url,
    backend=result_backend,
    include=[
        # Service task modules — add each engine's tasks module here
        "services.notification_engine.app.tasks",
        "services.collections_engine.app.tasks",
        "services.risk_engine.app.tasks",
        "services.payment_engine.app.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # Re-queue on worker crash
    worker_prefetch_multiplier=1,  # Fair dispatch
)

celery_app.conf.beat_schedule = {
    "detect_overdue_loans_daily": {
        "task": "collections.detect_overdue",
        "schedule": crontab(hour=0, minute=5),
    },
    "apply_penalties_daily": {
        "task": "collections.apply_penalties",
        "schedule": crontab(hour=0, minute=15),
    },
    "escalate_overdue_daily": {
        "task": "collections.escalate_overdue",
        "schedule": crontab(hour=1, minute=0),
    },
    "send_daily_reminders": {
        "task": "notifications.send_daily_reminders",
        "schedule": crontab(hour=8, minute=0), # 8 AM daily
    }
}


# ---------------------------------------------------------------------------
# Infrastructure tasks
# ---------------------------------------------------------------------------

@celery_app.task(name="infra.health_ping", bind=True, max_retries=0)
def health_ping(self) -> dict:  # type: ignore[override]
    """Simple heartbeat task for monitoring queue connectivity."""
    return {"status": "ok", "worker": self.request.hostname}

# ---------------------------------------------------------------------------
# Task Signatures (to be imported by services triggering them)
# ---------------------------------------------------------------------------

@celery_app.task(name="risk.run_bureau_pull", bind=True)
def run_bureau_pull(self, application_id: str, user_id: str) -> dict:
    """Signature for async bureau pull."""
    pass

@celery_app.task(name="notifications.send_reminder", bind=True)
def send_reminder(self, user_id: str, loan_id: str, reminder_type: str) -> dict:
    """Signature for sending a reminder (SMS/WhatsApp)."""
    pass

@celery_app.task(name="collections.apply_penalty", bind=True)
def apply_penalty(self, loan_id: str) -> dict:
    """Signature for applying a penalty to an overdue loan."""
    pass

@celery_app.task(name="collections.escalate_overdue", bind=True)
def escalate_overdue(self, loan_id: str) -> dict:
    """Signature for escalating an overdue loan."""
    pass

