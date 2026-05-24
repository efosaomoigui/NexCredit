"""
services/risk_engine/app/core/config.py
---------------------------------------
Configuration settings for the Risk Engine.
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexCredit Risk Engine"
    
    # Redis for Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    # External APIs (Mocks)
    CRC_API_KEY: str = "mock_crc_key"
    MONO_SECRET_KEY: str = "mock_mono_key"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
