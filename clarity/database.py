import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")

def _init_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    else:
        # 5 second connection timeout for external postgres
        connect_args = {"connect_timeout": 5}
    
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")

try:
    engine = _init_engine(DB_URL)
    # Test connection if using an external database
    if not DB_URL.startswith("sqlite"):
        with engine.connect() as conn:
            pass
    logger.info("Successfully connected to database.")
except Exception as e:
    logger.error(f"Failed to connect to primary DATABASE_URL ({DB_URL}): {e}. Falling back to local SQLite.")
    DB_URL = "sqlite:///./clarity.db"
    engine = _init_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

