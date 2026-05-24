"""
services/lending_engine/app/core/config.py
------------------------------------------
Configuration settings for the Lending Engine.
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "NexCredit Lending Engine"
    
    # Redis for Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
