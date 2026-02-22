# Backend layout

EduAlign’s backend is organized by **feature** so you can find and change code quickly.

## Root-level (shared)

| File | Purpose |
|------|--------|
| **`database.py`** | SQLite engine, session factory, `get_db`, `init_db`. Used by auth and any future DB features. |
| **`models.py`** | SQLAlchemy models (e.g. `User`). Shared across packages. |

## Packages

### `auth/` — Sign up, login, sessions

| File | Purpose |
|------|--------|
| **`password.py`** | Hash/verify passwords, password strength rules. |
| **`jwt_.py`** | Create and decode JWT access tokens. |
| **`google_oauth.py`** | Verify Google ID tokens for “Sign in with Google”. |
| **`apple_oauth.py`** | Verify Sign in with Apple identity tokens (JWT via Apple JWKS). |
| **`validation.py`** | Username format validation. |
| **`user_queries.py`** | DB lookups: by username, Google ID, Apple ID, or user id. |
| **`routes.py`** | FastAPI routes: `/api/auth/signup`, `/api/auth/login`, `/api/auth/google`, `/api/auth/apple`, `/api/auth/me`, plus `get_current_user` dependency. |

Auth env: `JWT_SECRET`, `GOOGLE_CLIENT_ID` (Google OAuth), `APPLE_CLIENT_ID` (Sign in with Apple Services ID). If the `users` table already existed before Apple was added, add column: `ALTER TABLE users ADD COLUMN apple_id VARCHAR(256) UNIQUE;` (or recreate the DB).

### `colleges/` — College data and matching

| File | Purpose |
|------|--------|
| **`preprocessing.py`** | Load/merge college + alumni data, `EXPERIENCE_DIMS`, trim/aggregate pipelines. |
| **`matching.py`** | `get_matches()` — Gemini-based college recommendations from student preferences. |

### `financials/` — Cost and planning

| File | Purpose |
|------|--------|
| **`plans.py`** | Semester cost estimates, graduation plan, budget tracker, find alternatives. |

### `scripts/` — One-off or data scripts

| File | Purpose |
|------|--------|
| **`seed_alumni.py`** | Generate synthetic alumni ratings CSV. Run: `python -m backend.scripts.seed_alumni` from project root. |

## Imports

- **Auth:** `from backend.auth import router, get_current_user`
- **Colleges:** `from backend.colleges import load_merged_data, EXPERIENCE_DIMS, get_matches`
- **Financials:** `from backend.financials import graduation_plan, estimate_semester_cost, ...`
- **DB:** `from backend.database import get_db, init_db`
- **Models:** `from backend.models import User`
