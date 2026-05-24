"""
shared/integrations/stellas/mock.py
-----------------------------------
Mock client for Stellas.
"""
import logging
import uuid

logger = logging.getLogger(__name__)

class StellasMock:
    async def create_virtual_account(self, user_id: str, full_name: str, phone: str):
        logger.info(f"[MOCK STELLAS] Creating virtual account for {full_name} ({user_id})")
        return {
            "accountNumber": "0123456789",
            "accountName": full_name,
            "bankName": "Stellas Bank",
            "reference": f"VA-{user_id}"
        }

    async def initiate_transfer(self, amount: int, account_number: str, bank_code: str, narration: str, reference: str):
        logger.info(f"[MOCK STELLAS] Initiating transfer of {amount} to {account_number} ({bank_code})")
        return {
            "transferId": str(uuid.uuid4()),
            "status": "pending",
            "reference": reference
        }
