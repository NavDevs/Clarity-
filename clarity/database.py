import os
import logging

from sqlalchemy import create_engine
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
    """Yields a database session (fast path — no pre-yield ping).

    Stale/cold connections are handled by ``pool_pre_ping=True`` on the
    engine, which validates the checkout with a single round trip only when
    needed. A manual ``SELECT 1`` before every request would double that
    cost on the hot path, and sleeping/retries inside the dependency block
    the worker — the frontend already retries wakeups in the background.

    IMPORTANT: the ``yield`` must never sit inside an ``except Exception``
    block — exceptions thrown *into* the generator by downstream
    dependencies (e.g. 401 from get_current_user) must propagate untouched,
    otherwise FastAPI raises "generator didn't stop after throw()" → 500
    with no CORS headers.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass
