"""FastAPI auth routes: signup, login, Google login, and /me."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.auth.apple_oauth import verify_apple_token
from backend.auth.google_oauth import verify_google_token
from backend.auth.jwt_ import create_access_token, decode_access_token
from backend.auth.password import hash_password, is_valid_password, verify_password
from backend.auth.user_queries import (
    get_user_by_apple_id,
    get_user_by_google_id,
    get_user_by_id,
    get_user_by_username,
)
from backend.auth.validation import is_valid_username
from backend.database import get_db
from backend.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


# ── Request / Response ─────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Google OAuth2 ID token from frontend")


class AppleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Sign in with Apple identity token from frontend")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Dependencies ─────────────────────────────────────────────────────────────

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return current user if valid Bearer token present, else None."""
    if not credentials or credentials.scheme != "Bearer":
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    return get_user_by_id(db, int(payload["sub"]))


def get_current_user(user: Optional[User] = Depends(get_current_user_optional)) -> User:
    """Require a logged-in user; 401 if not."""
    if user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Create account with username and password."""
    if not is_valid_username(req.username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3–32 characters: letters, numbers, dots, underscores, hyphens only.",
        )
    ok, msg = is_valid_password(req.password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    existing = get_user_by_username(db, req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken.")

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, user=user.to_dict())


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Log in with username and password."""
    user = get_user_by_username(db, req.username)
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Password is incorrect.")

    token = create_access_token(data={"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, user=user.to_dict())


@router.post("/google", response_model=TokenResponse)
def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Log in or sign up with Google. Send the Google ID token from your frontend."""
    payload = verify_google_token(req.id_token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Google token. Check GOOGLE_CLIENT_ID and that the token is from your app.",
        )

    google_id = payload.get("sub")
    email = payload.get("email") or ""
    name = (payload.get("name") or email or google_id or "user").strip()

    user = get_user_by_google_id(db, google_id)
    if user:
        token = create_access_token(data={"sub": user.id, "username": user.username})
        return TokenResponse(access_token=token, user=user.to_dict())

    base_username = (email.split("@")[0] if email else name).lower()
    base_username = "".join(c for c in base_username if c.isalnum() or c in "._-") or "user"
    username = base_username
    n = 0
    while get_user_by_username(db, username):
        n += 1
        username = f"{base_username}{n}"

    user = User(
        username=username,
        email=email or None,
        google_id=google_id,
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, user=user.to_dict())


@router.post("/apple", response_model=TokenResponse)
def apple_login(req: AppleLoginRequest, db: Session = Depends(get_db)):
    """Log in or sign up with Sign in with Apple. Send the Apple identity token from your frontend."""
    payload = verify_apple_token(req.id_token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Apple token. Check APPLE_CLIENT_ID and that the token is from your app.",
        )

    apple_id = payload.get("sub")
    email = (payload.get("email") or "").strip()

    user = get_user_by_apple_id(db, apple_id)
    if user:
        token = create_access_token(data={"sub": user.id, "username": user.username})
        return TokenResponse(access_token=token, user=user.to_dict())

    # New user: create account. Apple may not send name on subsequent requests.
    base_username = (email.split("@")[0] if email else f"apple_{apple_id[:8]}").lower()
    base_username = "".join(c for c in base_username if c.isalnum() or c in "._-") or "apple_user"
    username = base_username
    n = 0
    while get_user_by_username(db, username):
        n += 1
        username = f"{base_username}{n}"

    user = User(
        username=username,
        email=email or None,
        apple_id=apple_id,
        password_hash=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id, "username": user.username})
    return TokenResponse(access_token=token, user=user.to_dict())


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """Return the currently logged-in user (requires Authorization: Bearer <token>)."""
    return user.to_dict()
