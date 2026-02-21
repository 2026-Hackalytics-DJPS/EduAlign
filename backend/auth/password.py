"""Password hashing and strength validation."""

import re
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIREMENTS = (
    "Password must be at least 8 characters; "
    "include at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*(),.?\":{}|<>)."
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def is_valid_password(password: str) -> tuple[bool, str]:
    """Check password against strength rules. Returns (ok, error_message)."""
    if len(password) < PASSWORD_MIN_LENGTH:
        return False, PASSWORD_REQUIREMENTS
    if not re.search(r"[A-Z]", password):
        return False, PASSWORD_REQUIREMENTS
    if not re.search(r"[a-z]", password):
        return False, PASSWORD_REQUIREMENTS
    if not re.search(r"\d", password):
        return False, PASSWORD_REQUIREMENTS
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\];/\\'`~]", password):
        return False, PASSWORD_REQUIREMENTS
    return True, ""
