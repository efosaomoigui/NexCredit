"""
shared/database.py
------------------
Asynchronous SQLAlchemy engine and session factory for NexCredit services.
"""
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://nexcredit:changeme@localhost:5433/lending_dev")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing a database session to FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session
