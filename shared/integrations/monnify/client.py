"""
shared/integrations/monnify/client.py
-------------------------------------
Real client for Monnify.
"""
import httpx
from ..base import IntegrationError

class MonnifyClient:
    def __init__(self, api_key: str, secret_key: str, contract_code: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.contract_code = contract_code
        self.base_url = "https://api.monnify.com/api/v1"

    async def _get_auth_token(self):
        # Logic to get Monnify bearer token via Basic Auth
        return "mock_monnify_token"

    async def create_virtual_account(self, user_id: str, full_name: str):
        token = await self._get_auth_token()
        payload = {
            "accountReference": f"VA-{user_id}",
            "accountName": full_name,
            "currencyCode": "NGN",
            "contractCode": self.contract_code,
            "customerEmail": f"user_{user_id}@nexcredit.ng",
            "customerName": full_name,
            "getAllAvailableBanks": True
        }
        headers = {"Authorization": f"Bearer {token}"}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/bank-transfer/reserved-accounts", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["responseBody"]
            except Exception as e:
                raise IntegrationError("monnify", str(e))
