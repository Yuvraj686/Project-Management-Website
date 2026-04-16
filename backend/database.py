"""
TeamForge — Database Module

Creates the async SQLAlchemy engine and session factory. All database
interactions use `AsyncSession` to avoid blocking the event loop.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from config import settings

# Convert a standard postgresql:// URL to asyncpg's postgresql+asyncpg:// scheme
_db_url = settings.DATABASE_URL
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

# ── Async Engine ────────────────────────────────────────────────────────────
engine = create_async_engine(
    _db_url,
    echo=False,                                 # Disable SQL logging
    pool_pre_ping=True,                         # Detect stale connections
    pool_size=10,
    max_overflow=20,
)

# ── Session Factory ─────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Base declarative class ──────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All ORM models inherit from this base class."""
    pass


# ── Dependency ──────────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:
    """
    FastAPI dependency that yields an async database session and ensures
    it is closed after the request, even if an exception occurs.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
