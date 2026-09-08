import os
import logging
import time

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")

# ---------------------------------------------------------------------------
# Engine Configuration
# ---------------------------------------------------------------------------

def _init_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    else:
        # Give Supabase plenty of time to respond
        connect_args = {"connect_timeout": 15}
    
    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,      # Tests connection before using it
        pool_recycle=300,        # Recycles connections before Supabase drops them
        pool_size=5,
        max_overflow=10,
    )

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")
engine = _init_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ---------------------------------------------------------------------------
# Connection with Retry Logic (Moved to get_db so server doesn't crash on boot)
# ---------------------------------------------------------------------------

def get_db():
    """
    Yields a database session. On the first real request this will attempt to
    connect to Supabase. This prevents the server from crashing on startup if
    the database URL is wrong or if it's an IPv6 timeout.
    """
    db = SessionLocal()
    
    if DB_URL.startswith("sqlite"):
        try:
            yield db
        finally:
            db.close()
        return

    # Retry loop for external databases (Postgres)
    max_retries = 3
    retry_delay = 5

    for attempt in range(max_retries):
        try:
            db.execute(text("SELECT 1"))
            yield db
            return
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}). Retrying... ({e})")
                time.sleep(retry_delay)
            else:
                logger.error(f"FATAL: Cannot connect to Supabase. Please check your DATABASE_URL in Render. Error: {e}")
                raise HTTPException(
                    status_code=503,
                    detail="Database connection failed. Please check the server logs."
                )
        finally:
            try:
                db.close()
            except Exception:
                pass
