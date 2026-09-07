"""
database.py — Clarity's resilient database layer.

Design contract:
  1. FastAPI ALWAYS starts instantly — no blocking at import time.
  2. The engine is created once; SQLAlchemy's connection pool handles reconnects.
  3. get_db() retries indefinitely until Supabase wakes up (with a cap to avoid
     hanging user requests forever). If it genuinely cannot connect after the cap,
     it raises an HTTPException(503) so the user gets a clear error and the server
     stays alive.
  4. pool_pre_ping=True means every borrowed connection is tested before use —
     stale connections are automatically replaced, not handed to your code.
"""

import os
import logging
import time

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
engine = _build_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ---------------------------------------------------------------------------
# get_db — retry until Supabase wakes, never crash the server
# ---------------------------------------------------------------------------

_MAX_WAIT_SECONDS = 60   # Total time we'll wait for Supabase to wake (free tier ~30s)
_RETRY_INTERVAL   = 5    # Seconds between attempts


def get_db():
    """
    FastAPI dependency that yields a database session.

    Behaviour:
    - SQLite → yields immediately (local dev / CI).
    - Postgres → retries for up to _MAX_WAIT_SECONDS if Supabase is asleep.
    - After _MAX_WAIT_SECONDS of failure → returns HTTP 503 to the caller.
      The server process itself NEVER crashes from a database error.
    """
    # SQLite never needs retries
    if DB_URL.startswith("sqlite"):
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
        return

    # Postgres — retry loop
    deadline = time.monotonic() + _MAX_WAIT_SECONDS
    attempt = 0

    while True:
        attempt += 1
        db = SessionLocal()
        try:
            # pool_pre_ping handles stale connections, but we do an explicit
            # ping here so we know the DB is truly reachable before yielding.
            db.execute(text("SELECT 1"))
            # ✅ Connection is live — hand the session to the endpoint
            yield db
            return                              # normal exit after endpoint finishes
        except Exception as e:
            db.close()
            remaining = deadline - time.monotonic()
            err_short  = str(e).splitlines()[-1] if str(e).splitlines() else str(e)

            if remaining > 0:
                wait = min(_RETRY_INTERVAL, remaining)
                logger.warning(
                    f"[DB] Attempt {attempt} failed ({err_short}). "
                    f"Retrying in {wait:.0f}s ({remaining:.0f}s remaining)…"
                )
                time.sleep(wait)
            else:
                # We've waited long enough — tell the user, keep the server alive
                logger.error(
                    f"[DB] Could not connect after {_MAX_WAIT_SECONDS}s. "
                    f"Returning 503 to caller. Last error: {err_short}"
                )
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "The database is temporarily unavailable. "
                        "Please try again in a moment — it is waking up."
                    ),
                )
        finally:
            try:
                db.close()
            except Exception:
                pass
