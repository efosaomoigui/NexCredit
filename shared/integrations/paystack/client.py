"""
shared/integrations/paystack/client.py
--------------------------------------
Real client for Paystack.
"""
import hmac
import hashlib
import httpx
from ..base import IntegrationError, WebhookVerificationError

class PaystackClient:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.base_url = "https://api.paystack.co"

    async def create_payment_link(self, amount: int, reference: str, callback_url: str):
        payload = {
            "amount": amount * 100, # convert to kobo
            "reference": reference,
            "callback_url": callback_url,
            "email": "customer@example.com" # Required by Paystack
        }
        headers = {"Authorization": f"Bearer {self.secret_key}"}
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(f"{self.base_url}/transaction/initialize", json=payload, headers=headers)
                resp.raise_for_status()
                return resp.json()["data"]["authorization_url"]
            except Exception as e:
                raise IntegrationError("paystack", str(e))

    def verify_webhook(self, payload: str, signature: str) -> bool:
        calculated = hmac.new(self.secret_key.encode(), payload.encode(), hashlib.sha512).hexdigest()
        if not hmac.compare_digest(calculated, signature):
            raise WebhookVerificationError("paystack", "Invalid signature")
        return True
