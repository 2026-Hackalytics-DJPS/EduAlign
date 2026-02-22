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


def run_migrations():
    """Add columns that may be missing from an older schema (idempotent)."""
    from sqlalchemy import text

    alter_statements = [
        "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN gpa REAL",
        "ALTER TABLE users ADD COLUMN sat INTEGER",
        "ALTER TABLE users ADD COLUMN intended_major VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN preferred_state VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN school_size VARCHAR(32)",
        "ALTER TABLE users ADD COLUMN budget_range VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN campus_vibe TEXT",
        "ALTER TABLE users ADD COLUMN sports VARCHAR(256)",
        "ALTER TABLE users ADD COLUMN extracurriculars VARCHAR(256)",
        "ALTER TABLE users ADD COLUMN profile_complete BOOLEAN DEFAULT 0",
    ]
    with engine.connect() as conn:
        for stmt in alter_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()
