import os
import logging
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")

def _init_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    else:
        # Higher timeout for external databases
        connect_args = {"connect_timeout": 15}
    
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")

engine = _init_engine(DB_URL)

# Attempt to connect to the database, with retries for Supabase wake-up
max_retries = 12
retry_delay = 5

for attempt in range(max_retries):
    try:
        if not DB_URL.startswith("sqlite"):
            with engine.connect() as conn:
                pass
        logger.info("Successfully connected to database.")
        break
    except Exception as e:
        if attempt < max_retries - 1:
            logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}), retrying in {retry_delay}s... ({str(e).splitlines()[-1] if str(e).splitlines() else e})")
            time.sleep(retry_delay)
        else:
            logger.error(f"Failed to connect to database after {max_retries} attempts.")
            if os.environ.get("ENVIRONMENT") == "development" or "sqlite" in DB_URL:
                logger.warning("Falling back to local SQLite for development.")
                DB_URL = "sqlite:///./clarity.db"
                engine = _init_engine(DB_URL)
            else:
                # In production, we should raise the error rather than wiping user data with a fresh SQLite db
                raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

