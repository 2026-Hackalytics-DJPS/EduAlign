"""Password hashing and strength validation. Uses bcrypt directly to avoid passlib/bcrypt version issues."""

import re
import bcrypt

# bcrypt has a 72-byte limit; we truncate to avoid ValueError
BCRYPT_MAX_BYTES = 72

PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIREMENTS = (
    "Password must be at least 8 characters; "
    "include at least one uppercase letter, one lowercase letter, one digit, and one special character (!@#$%^&*(),.?\":{}|<>)."
)


def _to_bytes(password: str) -> bytes:
    secret = password.encode("utf-8")
    if len(secret) > BCRYPT_MAX_BYTES:
        secret = secret[:BCRYPT_MAX_BYTES]
    return secret


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(plain), hashed.encode("utf-8"))
    except Exception:
        return False


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
