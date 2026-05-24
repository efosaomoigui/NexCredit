"""
shared/integrations/factory.py
------------------------------
Factory to toggle between real and mock integration clients.
"""
import os
from .termii.client import TermiiClient
from .termii.mock import TermiiMock
from .paystack.client import PaystackClient
from .flutterwave.client import FlutterwaveClient
from .monnify.client import MonnifyClient
from .stellas.client import StellasClient
from .stellas.mock import StellasMock
from .youverify.client import YouverifyClient
from .youverify.mock import YouverifyMock
from .crc.client import CRCClient
from .crc.mock import CRCMock
from .email.client import EmailClient

class IntegrationFactory:
    @staticmethod
    def get_termii():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            return TermiiMock()
        return TermiiClient(
            api_key=os.getenv("TERMII_API_KEY", ""),
            sender_id=os.getenv("TERMII_SENDER_ID", "NexCredit")
        )

    @staticmethod
    def get_paystack():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            # return PaystackMock() # To be implemented
            pass
        return PaystackClient(secret_key=os.getenv("PAYSTACK_SECRET_KEY", ""))

    @staticmethod
    def get_flutterwave():
        return FlutterwaveClient(secret_key=os.getenv("FLUTTERWAVE_SECRET_KEY", ""))

    @staticmethod
    def get_monnify():
        return MonnifyClient(
            api_key=os.getenv("MONNIFY_API_KEY", ""),
            secret_key=os.getenv("MONNIFY_SECRET_KEY", ""),
            contract_code=os.getenv("MONNIFY_CONTRACT_CODE", "")
        )

    @staticmethod
    def get_stellas():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            return StellasMock()
        return StellasClient(
            api_key=os.getenv("STELLAS_API_KEY", ""),
            base_url=os.getenv("STELLAS_BASE_URL", "https://api.stellas.com")
        )

    @staticmethod
    def get_youverify():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            return YouverifyMock()
        return YouverifyClient(
            api_key=os.getenv("YOUVERIFY_API_KEY", "")
        )

    @staticmethod
    def get_crc():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            return CRCMock()
        return CRCClient(
            api_key=os.getenv("CRC_API_KEY", ""),
            username=os.getenv("CRC_USERNAME", "")
        )

    @staticmethod
    def get_email():
        if os.getenv("USE_MOCK_PROVIDERS") == "true":
            # return EmailMock() # To be implemented
            pass
        return EmailClient(
            host=os.getenv("SMTP_HOST", "smtp.office365.com"),
            port=int(os.getenv("SMTP_PORT", "587")),
            username=os.getenv("SMTP_USER", ""),
            password=os.getenv("SMTP_PASS", ""),
            use_tls=os.getenv("SMTP_USE_TLS", "true").lower() == "true",
            sender_email=os.getenv("SMTP_SENDER", "")
        )
