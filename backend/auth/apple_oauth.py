"""Sign in with Apple: verify Apple identity token (JWT) using Apple's JWKS."""

import os
from typing import Optional

import requests
from dotenv import load_dotenv
from jose import jwt, jwk
from jose.exceptions import JWTError

load_dotenv()

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "")


def _get_apple_public_key(kid: str) -> Optional[object]:
    """Fetch Apple JWKS and return the key object for the given kid."""
    try:
        resp = requests.get(APPLE_JWKS_URL, timeout=10)
        resp.raise_for_status()
        jwks = resp.json()
    except Exception:
        return None
    key_dict = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key_dict:
        return None
    try:
        return jwk.construct(key_dict)
    except Exception:
        return None


def verify_apple_token(id_token_str: str) -> Optional[dict]:
    """
    Verify Sign in with Apple identity token (JWT).
    Returns payload with sub, email (if shared), etc., or None if invalid.
    """
    if not APPLE_CLIENT_ID:
        return None
    try:
        unverified = jwt.get_unverified_header(id_token_str)
        kid = unverified.get("kid")
        if not kid:
            return None
        key = _get_apple_public_key(kid)
        if not key:
            return None
        payload = jwt.decode(
            id_token_str,
            key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        # Validate issuer
        if payload.get("iss") != APPLE_ISSUER:
            return None
        # Audience can be string or list (e.g. client_id + bundle id)
        aud = payload.get("aud")
        if isinstance(aud, list):
            if APPLE_CLIENT_ID not in aud:
                return None
        elif aud != APPLE_CLIENT_ID:
            return None
        return payload
    except JWTError:
        return None
    except Exception:
        return None
