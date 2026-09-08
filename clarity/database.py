import os
import logging
import time

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")


def _init_engine(url: str):
    if not url:
        url = "sqlite:///./clarity.db"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Strip surrounding quotes if user accidentally added them in Render
    url = url.strip().strip('"').strip("'")
    # Remove pgbouncer=true — this is a Prisma-only param, not valid for SQLAlchemy
    url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        return create_engine(url, connect_args=connect_args), url
    else:
        connect_args = {"connect_timeout": 15}
        return create_engine(
            url,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            # Required for Supabase transaction-mode pooler (pgbouncer)
            execution_options={"prepared_statement_cache_size": 0},
        ), url


# ---------------------------------------------------------------------------
# Try to create the engine — if DATABASE_URL is malformed, fall back to SQLite
# ---------------------------------------------------------------------------
_raw_url = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")

try:
    engine, DB_URL = _init_engine(_raw_url)
    logger.info(f"Database engine created for: {'Postgres (Supabase)' if 'supabase' in _raw_url or 'postgres' in _raw_url.lower() else 'SQLite'}")
except Exception as e:
    logger.error(f"DATABASE_URL is invalid and could not be parsed: {e}")
    logger.warning("Falling back to SQLite — fix your DATABASE_URL in Render environment variables!")
    DB_URL = "sqlite:///./clarity.db"
    engine, DB_URL = _init_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Yields a database session, with retry for Postgres cold starts."""
    db = SessionLocal()

    if DB_URL.startswith("sqlite"):
        try:
            yield db
        finally:
            db.close()
        return

    # Retry loop for external Postgres (handles Supabase cold starts)
    max_retries = 3
    retry_delay = 5
    for attempt in range(max_retries):
        try:
            db.execute(text("SELECT 1"))
            yield db
            return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"DB connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Cannot connect to database: {e}")
                raise HTTPException(
                    status_code=503,
                    detail="Database connection failed. Please try again in a moment."
                )
        finally:
            try:
                db.close()
            except Exception:
                pass
