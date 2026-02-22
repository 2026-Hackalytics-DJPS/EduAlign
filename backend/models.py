"""
SQLAlchemy models for EduAlign.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(256), unique=True, nullable=True, index=True)  # set for Google users
    password_hash = Column(String(256), nullable=True)  # null for Google-only users
    google_id = Column(String(256), unique=True, nullable=True, index=True)  # Google sub
    apple_id = Column(String(256), unique=True, nullable=True, index=True)  # Apple sub
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    gpa = Column(Float, nullable=True)
    sat = Column(Integer, nullable=True)
    major = Column(String(128), nullable=True)
    location = Column(String(128), nullable=True)
    extracurriculars = Column(String(512), nullable=True)
    in_state_preference = Column(Boolean, default=False)
    free_text = Column(String(1024), nullable=True)
    academic_intensity = Column(Integer, default=5)
    social_life = Column(Integer, default=5)
    inclusivity = Column(Integer, default=5)
    career_support = Column(Integer, default=5)
    collaboration_vs_competition = Column(Integer, default=5)
    mental_health_culture = Column(Integer, default=5)
    campus_safety = Column(Integer, default=5)
    overall_satisfaction = Column(Integer, default=5)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    SLIDER_KEYS = [
        "academic_intensity", "social_life", "inclusivity", "career_support",
        "collaboration_vs_competition", "mental_health_culture", "campus_safety",
        "overall_satisfaction",
    ]

    def to_dict(self):
        return {
            "gpa": self.gpa,
            "sat": self.sat,
            "major": self.major,
            "location": self.location,
            "extracurriculars": self.extracurriculars,
            "in_state_preference": self.in_state_preference,
            "free_text": self.free_text,
            "sliders": {k: getattr(self, k) for k in self.SLIDER_KEYS},
        }
