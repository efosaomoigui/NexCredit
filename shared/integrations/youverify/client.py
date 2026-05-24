"""
shared/integrations/youverify/client.py
---------------------------------------
Real client for Youverify (BVN/NIN checks).
"""
import httpx
from ..base import IntegrationError

class YouverifyClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.youverify.co/v2/api/identity"

    async def verify_bvn(self, bvn: str):
        headers = {"token": self.api_key}
        payload = {"id": bvn, "isSubjectConsent": True}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/ng/bvn", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["data"]
            except Exception as e:
                raise IntegrationError("youverify", str(e))

    async def verify_nin(self, nin: str):
        headers = {"token": self.api_key}
        payload = {"id": nin, "isSubjectConsent": True}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/ng/nin", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["data"]
            except Exception as e:
                raise IntegrationError("youverify", str(e))
