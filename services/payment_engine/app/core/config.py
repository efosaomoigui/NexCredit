"""
services/payment_engine/app/core/config.py
------------------------------------------
Configuration settings for Payment Engine.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexCredit Payment Engine"

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_WEBHOOK_SECRET: str = ""
    PAYSTACK_CALLBACK_URL: str = "https://nexcredit.ng/repayment-success"

    FLUTTERWAVE_SECRET_KEY: str = ""
    FLUTTERWAVE_WEBHOOK_SECRET: str = ""
    FLUTTERWAVE_CALLBACK_URL: str = "https://api.nexcredit.ng/api/v1/payment/webhooks/flutterwave"

    STELLAS_SECRET_KEY: str = ""
    STELLAS_BASE_URL: str = "https://api.stellas.com"

    USE_MOCK_PROVIDERS: bool = True
    SIMULATE_DISBURSEMENT_ON_FAILURE: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
