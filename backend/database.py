"""
SQLite database setup for EduAlign.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from dotenv import load_dotenv

load_dotenv()

# Store DB in project root so it persists and is easy to find
DB_DIR = Path(__file__).resolve().parent.parent
DB_PATH = DB_DIR / "edualign.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call once at startup or when adding new models."""
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
