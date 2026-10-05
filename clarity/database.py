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
        connect_args={"connect_timeout": 15, "sslmode": "require"},
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
    """Yields a database session, with retry for Postgres cold starts.

    IMPORTANT: the retry loop only wraps the pre-yield connection test.
    Exceptions thrown *into* the generator by downstream dependencies
    (e.g. 401 from get_current_user) must propagate untouched — otherwise
    FastAPI raises "generator didn't stop after throw()" → 500 with no
    CORS headers (which is exactly the bug seen in Render logs).
    """
    db = SessionLocal()

    if DB_URL.startswith("sqlite"):
        try:
            yield db
        finally:
            try:
                db.close()
            except Exception:
                pass
        return

    # Pre-yield connection check with retries (Neon / Supabase cold starts).
    # This block never contains the `yield`, so downstream HTTPExceptions
    # can never be mistaken for DB connection failures.
    max_retries = 3
    retry_delay = 5
    last_exc: Exception | None = None
    for attempt in range(max_retries):
        try:
            db.execute(text("SELECT 1"))
            last_exc = None
            break
        except Exception as e:
            last_exc = e
            if attempt < max_retries - 1:
                logger.warning(f"DB connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
                try:
                    db.close()
                except Exception:
                    pass
                db = SessionLocal()
            else:
                logger.error(f"Cannot connect to database: {e}")
                try:
                    db.close()
                except Exception:
                    pass
                raise HTTPException(
                    status_code=503,
                    detail="Database connection failed. Please try again in a moment.",
                )

    # Yield outside any except-Exception block so 401s etc. propagate cleanly.
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass
