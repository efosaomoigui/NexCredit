"""
services/risk_engine/app/tasks.py
---------------------------------
Asynchronous underwriting tasks using Celery.
"""
import asyncio
from celery import Celery
from services.risk_engine.app.core.config import settings
from shared.database import AsyncSessionLocal
from services.risk_engine.app.services.scorer import ScorerService
import uuid

celery_app = Celery(
    "risk_tasks",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/0"
)

@celery_app.task(name="underwrite_application")
def underwrite_application_task(application_id_str: str):
    """
    Celery task to run the full scoring pipeline.
    """
    application_id = uuid.UUID(application_id_str)
    
    async def run_pipeline():
        async with AsyncSessionLocal() as session:
            await ScorerService.compute_composite_score(session, application_id)
            
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return asyncio.create_task(run_pipeline())
    else:
        return loop.run_until_complete(run_pipeline())
