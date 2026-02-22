"""
SQLAlchemy models for EduAlign.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text
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
    is_admin = Column(Boolean, default=False, nullable=False)

    # Profile fields (filled on first login)
    gpa = Column(Float, nullable=True)
    intended_major = Column(String(128), nullable=True)
    preferred_state = Column(String(64), nullable=True)
    school_size = Column(String(32), nullable=True)
    budget_range = Column(String(64), nullable=True)
    campus_vibe = Column(Text, nullable=True)
    sports = Column(String(256), nullable=True)
    extracurriculars = Column(String(256), nullable=True)
    profile_complete = Column(Boolean, default=False)

    def to_dict(self):
        created_at = self.created_at
        if created_at is None:
            created_at_str = None
        elif hasattr(created_at, "isoformat"):
            created_at_str = created_at.isoformat()
        else:
            created_at_str = str(created_at)
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": created_at_str,
            "is_admin": bool(self.is_admin),
            "profile_complete": bool(self.profile_complete),
            "gpa": self.gpa,
            "intended_major": self.intended_major,
            "preferred_state": self.preferred_state,
            "school_size": self.school_size,
            "budget_range": self.budget_range,
            "campus_vibe": self.campus_vibe,
            "sports": self.sports,
            "extracurriculars": self.extracurriculars,
        }


class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    action_type = Column(String(64), nullable=False)
    metadata_ = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SavedCollege(Base):
    __tablename__ = "saved_colleges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    unitid = Column(Integer, nullable=False)
    tier = Column(String(16), default="target")  # dream, target, safety
    notes = Column(Text, nullable=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "unitid": self.unitid,
            "tier": self.tier,
            "notes": self.notes,
            "saved_at": self.saved_at.isoformat() if self.saved_at else None,
        }


class SavedPlan(Base):
    __tablename__ = "saved_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    unitid = Column(Integer, nullable=False)
    college_name = Column(String(256), nullable=True)
    inputs = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "unitid": self.unitid,
            "college_name": self.college_name,
            "inputs": self.inputs,
            "result": self.result,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SavedComparison(Base):
    __tablename__ = "saved_comparisons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    unitids = Column(JSON, nullable=False)
    label = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "unitids": self.unitids,
            "label": self.label,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


REVIEW_TAGS = [
    "Great Professors", "Party School", "Research Focused", "Good Food",
    "Beautiful Campus", "Diverse", "Greek Life", "Hard Coursework",
    "Career Focused", "Collaborative", "Safe Campus", "Affordable",
    "Strong Alumni Network", "Good Financial Aid", "Lots of Clubs",
    "Good Dorms", "Sports Culture", "Small Class Sizes", "Big School Energy",
    "Liberal Arts Vibe",
]


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    unitid = Column(Integer, nullable=False, index=True)
    overall_rating = Column(Integer, nullable=False)  # 1-5
    dimension_ratings = Column(JSON, nullable=True)  # {dim_key: 1-10}
    pros = Column(Text, nullable=False)
    cons = Column(Text, nullable=False)
    advice = Column(Text, nullable=True)
    would_recommend = Column(String(8), nullable=False)  # yes, no, maybe
    attendance_status = Column(String(32), nullable=False)  # current, alumni, transfer
    year = Column(String(16), nullable=True)  # Freshman, Sophomore, etc. or grad year
    major = Column(String(128), nullable=True)
    tags = Column(JSON, nullable=True)  # list of tag strings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)

    def to_dict(self, username: str | None = None):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": username,
            "unitid": self.unitid,
            "overall_rating": self.overall_rating,
            "dimension_ratings": self.dimension_ratings,
            "pros": self.pros,
            "cons": self.cons,
            "advice": self.advice,
            "would_recommend": self.would_recommend,
            "attendance_status": self.attendance_status,
            "year": self.year,
            "major": self.major,
            "tags": self.tags or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "upvotes": self.upvotes or 0,
            "downvotes": self.downvotes or 0,
        }


class ReviewVote(Base):
    __tablename__ = "review_votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vote = Column(Integer, nullable=False)  # +1 or -1
    created_at = Column(DateTime(timezone=True), server_default=func.now())


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
