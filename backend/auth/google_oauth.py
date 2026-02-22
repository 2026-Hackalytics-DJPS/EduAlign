"""Google OAuth2 ID token verification for sign-in with Google."""

import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    _GOOGLE_AVAILABLE = True
except ImportError:
    _GOOGLE_AVAILABLE = False

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


def verify_google_token(id_token_str: str) -> Optional[dict]:
    """Verify Google OAuth2 ID token; return payload (sub, email, etc.) or None."""
    if not _GOOGLE_AVAILABLE:
        return None
    if not GOOGLE_CLIENT_ID:
        return None
    try:
        payload = id_token.verify_oauth2_token(
            id_token_str,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        return payload
    except Exception:
        return None
