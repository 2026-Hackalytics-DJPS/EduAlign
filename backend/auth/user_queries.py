"""Database queries for user lookup (by username, Google ID, Apple ID, or primary key)."""

from typing import Optional

from sqlalchemy.orm import Session

from backend.models import User


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
    return db.query(User).filter(User.google_id == google_id).first()


def get_user_by_apple_id(db: Session, apple_id: str) -> Optional[User]:
    return db.query(User).filter(User.apple_id == apple_id).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()
