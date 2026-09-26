import os
import logging
import time

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")


def _build_url(url: str) -> str:
    """Normalise and clean the database URL string."""
    url = url.strip().strip('"').strip("'")
    # Heroku-style postgres:// → postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Remove pgbouncer=true — Prisma-only param, not valid for SQLAlchemy
    url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
    # Force psycopg2 driver — SQLAlchemy 2.x defaults to psycopg (v3) which is not installed
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def _init_engine(url: str):
    """Create the SQLAlchemy engine — never catches connection errors here."""
    if not url or url == "sqlite:///./clarity.db":
        logger.warning("No DATABASE_URL set — using temporary SQLite. History WILL be lost on restart!")
        return create_engine(
            "sqlite:///./clarity.db",
            connect_args={"check_same_thread": False},
        ), "sqlite:///./clarity.db"

    url = _build_url(url)

    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}), url

    # Postgres (Neon / Supabase / etc.) — URL already has +psycopg2 dialect forced by _build_url
    logger.info(f"Connecting to Postgres: {url[:30]}...")
    eng = create_engine(
        url,
        connect_args={"connect_timeout": 15},
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        execution_options={"prepared_statement_cache_size": 0},
    )
    return eng, url


# ---------------------------------------------------------------------------
# Build engine — NOTE: create_engine() itself never raises; only actual
# connections do. So we do NOT wrap this in try/except, which would hide
# a bad URL and silently fall back to SQLite.
# ---------------------------------------------------------------------------
_raw_url = os.environ.get("DATABASE_URL", "")

engine, DB_URL = _init_engine(_raw_url)

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

    # Retry loop for external Postgres (handles Neon / Supabase cold starts)
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
                db = SessionLocal()
            else:
                logger.error(f"Cannot connect to database: {e}")
                raise HTTPException(
                    status_code=503,
                    detail="Database connection failed. Please try again in a moment.",
                )
        finally:
            try:
                db.close()
            except Exception:
                pass
