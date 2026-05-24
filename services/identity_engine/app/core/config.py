"""
services/identity_engine/app/core/config.py
-------------------------------------------
Configuration settings for the Identity Engine.
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexCredit Identity Engine"
    
    # Security
    SECRET_KEY: str = "changeme_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # OTP
    OTP_TTL_SECONDS: int = 600
    MAX_OTP_ATTEMPTS: int = 10
    OTP_RATE_LIMIT_HOURS: int = 1
    DEBUG_INCLUDE_OTP_IN_RESPONSE: bool = False
    
    # External APIs (Mocks)
    TERMII_API_KEY: str = "mock_termii_key"
    YOUVERIFY_API_KEY: str = "mock_youverify_key"
    DOJAH_API_KEY: str = "mock_dojah_key"
    MONO_SECRET_KEY: str = "mock_mono_key"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
