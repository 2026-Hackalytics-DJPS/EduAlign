"""Lightweight activity logging — failures never crash the main request."""

from sqlalchemy.orm import Session
from backend.models import UserActivity


def log_activity(db: Session, user_id: int | None, action_type: str, metadata: dict | None = None):
    try:
        row = UserActivity(user_id=user_id, action_type=action_type, metadata_=metadata)
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()
