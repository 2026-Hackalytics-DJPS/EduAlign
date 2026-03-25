# Local Setup & Troubleshooting

Use this checklist when someone clones the repo and runs into errors or missing features.

## 1. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend (from project root)
pip install -r requirements.txt
# or: uv sync
```

## 2. Environment variables

Copy `.env.example` to `.env` if it exists, or ensure `.env` has:

- `DATABASE_URL` (optional; defaults to SQLite at project root)
- `GROQ_API_KEY` (optional; for AI matching; falls back to cosine similarity)
- `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` (if using OAuth)

## 3. Database migrations

The app runs migrations on startup. If you see column-related errors:

- Delete `edualign.db` and restart (creates fresh schema), **or**
- Manually run: `uv run python -c "from backend.database import run_migrations; run_migrations()"`

## 4. Start both servers

```bash
# Terminal 1: Backend
uv run uvicorn main:app --reload --host 0.0.0.0

# Terminal 2: Frontend
cd frontend && npm run dev
```

- Backend: http://localhost:8000  
- Frontend: http://localhost:5173 (proxies `/api` to backend)

## 5. Common errors

| Symptom | Likely cause |
|---------|--------------|
| 401 on `/api/auth/me` | Not logged in, or token expired |
| Redirect loop to `/screening` | `screening_complete` is false; complete the screening flow |
| Redirect to `/setup` | `profile_complete` is false; complete the profile form |
| Map shows nothing | Backend not running, or no colleges data; run preprocessing if needed |
| CORS errors | Access via `127.0.0.1` vs `localhost` mismatch; use same in both |
| Blank page / console errors | Check browser console; often missing env or backend down |

## 6. College data

If `/api/colleges` or map returns empty:

- Ensure `data/cleaned/colleges_merged.csv` exists
- If not: `uv run python -m backend.colleges.preprocessing` (or equivalent)

## 7. Access from another device

To access from another computer on the same network:

1. Run backend with `--host 0.0.0.0`
2. Update `vite.config.ts` proxy or set `VITE_API_URL` to your machine's IP
3. Add your IP to CORS `allow_origins` in `main.py` if needed
