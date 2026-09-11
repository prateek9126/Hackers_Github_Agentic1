"""
Database Session and Engine Initialization for SIH26153.
Configures database connectivity with automatic fallback to local SQLite
when PostgreSQL is offline, ensuring 100% offline functionality.
"""

import os
import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from backend.fastapi.core.config import settings
from backend.database.models import Base

logger = logging.getLogger("sih26153.database")

# Database Engine Initialization
_engine = None
_session_factory = None
is_postgres = False

# Default to SQLite for 100% offline standalone operation unless explicitly configured for PostgreSQL
should_try_postgres = (
    settings.USE_POSTGRES
    or settings.DB_ENGINE.lower() == "postgresql"
    or os.environ.get("USE_POSTGRES", "").lower() in ("true", "1", "yes")
)

if should_try_postgres:
    try:
        # Test connection to PostgreSQL with short timeout
        pg_url = settings.SYNC_DATABASE_URL
        test_engine = create_engine(pg_url, connect_args={"connect_timeout": 2}, pool_pre_ping=True)
        with test_engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
        _engine = test_engine
        is_postgres = True
    except Exception as e:
        logger.info(
            f"PostgreSQL unreachable at {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT} ({e}). "
            "Using local SQLite engine for offline operation."
        )
        is_postgres = False

if not is_postgres:
    sqlite_path = os.path.join(settings.DATA_DIR, "sih26153_offline.db")
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    _engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    is_postgres = False
    logger.info(f"Local SQLite database engine active ({sqlite_path}) for offline operation.")

# Create all tables on startup
Base.metadata.create_all(bind=_engine)
_session_factory = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding database session."""
    session = _session_factory()
    try:
        yield session
    finally:
        session.close()


def get_db_status() -> dict:
    """Returns connectivity and database type status."""
    return {
        "engine": "PostgreSQL" if is_postgres else "SQLite (Offline Engine)",
        "connected": True,
        "database": settings.POSTGRES_DB if is_postgres else "sih26153_offline.db",
    }
