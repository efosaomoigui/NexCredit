"""
services/payment_engine/app/tasks/disbursement.py
-------------------------------------------------
Celery tasks for loan disbursement.
"""
import asyncio
import uuid
from celery import Celery
from shared.database import AsyncSessionLocal
from services.payment_engine.app.services.disbursement import DisbursementService

# Use same redis config as others
celery_app = Celery("payment_tasks", broker="redis://localhost:6379/0")

@celery_app.task(name="execute_disbursement")
def execute_disbursement_task(loan_id_str: str):
    loan_id = uuid.UUID(loan_id_str)
    
    async def run():
        async with AsyncSessionLocal() as session:
            await DisbursementService.execute_disbursement(session, loan_id)
            
    asyncio.run(run())
