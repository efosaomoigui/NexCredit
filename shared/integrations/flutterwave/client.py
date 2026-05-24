"""
shared/integrations/flutterwave/client.py
-----------------------------------------
Real client for Flutterwave.
"""
import httpx
from ..base import IntegrationError

class FlutterwaveClient:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.base_url = "https://api.flutterwave.com/v3"

    async def initiate_transfer(self, amount: int, account_number: str, bank_code: str, narration: str, reference: str):
        payload = {
            "account_bank": bank_code,
            "account_number": account_number,
            "amount": amount,
            "narration": narration,
            "currency": "NGN",
            "reference": reference,
            "callback_url": "https://api.nexcredit.ng/api/v1/webhooks/flutterwave"
        }
        headers = {"Authorization": f"Bearer {self.secret_key}"}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/transfers", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                raise IntegrationError("flutterwave", str(e))
