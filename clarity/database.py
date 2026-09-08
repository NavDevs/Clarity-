import os
import logging
import time

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

# ---------------------------------------------------------------------------
# Connection with Retry Logic (No SQLite Fallback!)
# ---------------------------------------------------------------------------
# We no longer fall back to SQLite automatically because it wipes user data.
# We retry connecting to Supabase for up to 30 seconds to let it wake up.

engine = _init_engine(DB_URL)

max_retries = 6
retry_delay = 5

for attempt in range(max_retries):
    try:
        if not DB_URL.startswith("sqlite"):
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        logger.info(f"Successfully connected to database: {DB_URL.split('@')[-1] if '@' in DB_URL else 'SQLite'}")
        break
    except Exception as e:
        if attempt < max_retries - 1:
            logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay}s... ({str(e).splitlines()[-1] if str(e).splitlines() else e})")
            time.sleep(retry_delay)
        else:
            logger.error(f"Failed to connect to primary DATABASE_URL ({DB_URL}) after {max_retries} attempts.")
            # In development we can fallback to sqlite, but in production we must raise
            # so the user knows they need to fix their DATABASE_URL in Render.
            if os.environ.get("ENVIRONMENT") == "development" or "sqlite" in DB_URL:
                logger.warning("Falling back to local SQLite for development.")
                DB_URL = "sqlite:///./clarity.db"
                engine = _init_engine(DB_URL)
            else:
                raise Exception(f"FATAL: Cannot connect to Supabase. Please check your DATABASE_URL in Render. Error: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
