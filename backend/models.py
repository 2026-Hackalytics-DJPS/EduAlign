"""
SQLAlchemy models for EduAlign.
"""

from sqlalchemy import Column, DateTime, String, Integer
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(256), unique=True, nullable=True, index=True)  # set for Google users
    password_hash = Column(String(256), nullable=True)  # null for Google-only users
    google_id = Column(String(256), unique=True, nullable=True, index=True)  # Google sub
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
