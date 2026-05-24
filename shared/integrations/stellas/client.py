"""
shared/integrations/stellas/client.py
-------------------------------------
Real client for Stellas API.
"""
import httpx
from ..base import IntegrationError

class StellasClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    async def create_virtual_account(self, user_id: str, full_name: str, phone: str):
        payload = {
            "accountName": full_name,
            "phoneNumber": phone,
            "reference": f"VA-{user_id}"
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/v1/virtual-accounts", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["data"]
            except Exception as e:
                raise IntegrationError("stellas", str(e))

    async def initiate_transfer(self, amount: int, account_number: str, bank_code: str, narration: str, reference: str):
        payload = {
            "amount": amount,
            "accountNumber": account_number,
            "bankCode": bank_code,
            "narration": narration,
            "reference": reference
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/v1/transfers", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["data"]
            except Exception as e:
                raise IntegrationError("stellas", str(e))
