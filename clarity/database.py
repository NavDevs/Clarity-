"""
database.py — Clarity's resilient database layer.

Design contract:
  1. FastAPI ALWAYS starts instantly — no blocking at import time.
  2. pool_pre_ping=True means every borrowed connection is tested before use —
     stale/dropped connections are automatically replaced.
  3. get_db() does a single quick ping. If it fails it raises HTTP 503
     immediately so the FRONTEND can retry with friendly UX, instead of
     blocking the request thread for a long time.
  4. pool_recycle prevents Supabase's 5-min idle timeout from leaving stale
     connections in the pool.
"""

import os
import logging

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")


# ---------------------------------------------------------------------------
# Engine — created once at import, no connection attempted yet
# ---------------------------------------------------------------------------

def _build_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("sqlite"):
        kwargs = dict(connect_args={"check_same_thread": False})
    else:
        kwargs = dict(
            connect_args={"connect_timeout": 10},
            pool_pre_ping=True,      # test connection before handing it out
            pool_recycle=280,        # recycle before Supabase's 5-min idle timeout
            pool_size=5,
            max_overflow=10,
        )

    return create_engine(url, **kwargs)


DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")
engine  = _build_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# get_db — fast fail with 503 so the frontend can retry gracefully
# ---------------------------------------------------------------------------

def get_db():
    """
    FastAPI dependency that yields a database session.

    Behaviour:
    - SQLite  → yields immediately (local dev).
    - Postgres → tries once. If Supabase is still asleep it returns HTTP 503
                 instantly so the frontend can show a friendly "waking up"
                 banner and retry after a few seconds.
                 The server process itself NEVER crashes.
    """
    db = SessionLocal()
    try:
        # Quick reachability check (pool_pre_ping also does this internally,
        # but being explicit lets us convert the error to a clean 503)
        if not DB_URL.startswith("sqlite"):
            db.execute(text("SELECT 1"))
        yield db
    except HTTPException:
        raise
    except Exception as e:
        err_short = str(e).splitlines()[-1] if str(e).splitlines() else str(e)
        logger.warning(f"[DB] Connection unavailable: {err_short}")
        raise HTTPException(
            status_code=503,
            detail="db_waking_up",   # frontend reads this specific key
        )
    finally:
        try:
            db.close()
        except Exception:
            pass
