import os
import logging
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("clarity.database")


def _init_engine(url: str):
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    else:
        connect_args = {"connect_timeout": 10}

    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=300,       # Recycle connections every 5 min
        pool_size=5,
        max_overflow=10,
    )


DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./clarity.db")
engine = _init_engine(DB_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Yields a database session. On the first real request this will attempt to
    connect to Supabase (which may be waking up). The retry happens here —
    NOT at module import time — so FastAPI starts up instantly.
    """
    max_retries = 6      # 6 × 5 s = 30 s max wait per request
    retry_delay = 5

    for attempt in range(max_retries):
        db = SessionLocal()
        try:
            # Quick connectivity check so we know the connection is alive
            if not DB_URL.startswith("sqlite"):
                db.execute(text("SELECT 1"))
            yield db
            return
        except Exception as e:
            db.close()
            err_msg = str(e).splitlines()[-1] if str(e).splitlines() else str(e)
            if attempt < max_retries - 1:
                logger.warning(
                    f"DB connection failed (attempt {attempt + 1}/{max_retries}), "
                    f"retrying in {retry_delay}s... ({err_msg})"
                )
                time.sleep(retry_delay)
            else:
                logger.error(f"DB unavailable after {max_retries} attempts: {err_msg}")
                raise
        finally:
            try:
                db.close()
            except Exception:
                pass
