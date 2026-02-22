"""
Auth package: signup, login (username/password and Google), and session handling.

- password    — hashing and strength validation
- jwt_        — create/decode access tokens
- google_oauth — verify Google ID tokens
- validation  — username rules
- user_queries — DB lookups by username / Google ID / id
- routes      — FastAPI router and get_current_user dependency
"""

from backend.auth.routes import (
    get_current_user,
    get_current_user_optional,
    router,
)

__all__ = ["router", "get_current_user", "get_current_user_optional"]
