"""
shared/integrations/termii/client.py
------------------------------------
Real client for Termii SMS and OTP.
"""
import httpx
from ..base import IntegrationError

class TermiiClient:
    def __init__(self, api_key: str, sender_id: str):
        self.api_key = api_key
        self.sender_id = sender_id
        self.base_url = "https://api.ng.termii.com/api"

    async def send_sms(self, phone: str, message: str):
        payload = {
            "to": phone,
            "from": self.sender_id,
            "sms": message,
            "type": "plain",
            "channel": "generic",
            "api_key": self.api_key
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/sms/send", json=payload)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                raise IntegrationError("termii", str(e), raw_response=getattr(e, 'response', None))

    async def send_whatsapp(self, phone: str, message: str):
        payload = {
            "to": phone,
            "from": self.sender_id,
            "sms": message,
            "type": "plain",
            "channel": "whatsapp",
            "api_key": self.api_key
        }
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/sms/send", json=payload)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                raise IntegrationError("termii_whatsapp", str(e), raw_response=getattr(e, 'response', None))
