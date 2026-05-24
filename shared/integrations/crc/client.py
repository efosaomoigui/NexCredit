"""
shared/integrations/crc/client.py
---------------------------------
Real client for CRC Credit Bureau.
"""
import httpx
from ..base import IntegrationError

class CRCClient:
    def __init__(self, api_key: str, username: str):
        self.api_key = api_key
        self.username = username
        self.base_url = "https://api.crccreditbureau.com/v1"

    async def get_report(self, bvn: str):
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"bvn": bvn, "username": self.username}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/report/consumer", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                # Parse to standard format
                return {
                    "score": data.get("credit_score", 0),
                    "active_loans": data.get("active_facilities", 0),
                    "delinquencies": data.get("delinquent_facilities", 0),
                    "total_outstanding": data.get("total_outstanding", 0),
                    "raw_response": data
                }
            except Exception as e:
                raise IntegrationError("crc", str(e))
