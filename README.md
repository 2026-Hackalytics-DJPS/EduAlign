# EduAlign

Find colleges that match your experience, not just your stats.

## Stack

- **Backend:** FastAPI (Python) — auth, college matching, financial plans, compare.
- **Frontend:** React (Vite + TypeScript) + Plotly.js — Find Your Match, Financial Planner, Compare Colleges.

## Run locally

1. **Backend** (from project root):
   ```bash
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
   API: http://localhost:8000

2. **Frontend:**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   App: http://localhost:5173 (proxies `/api` to the backend).

## Developer setup and gitignore

The app is **not** dependent on gitignored files. You can clone and run without any local secrets or DB files.

| Gitignored | Purpose | App behavior without it |
|------------|---------|-------------------------|
| `.env` | Secrets (JWT, OAuth, API keys) | Uses defaults: local SQLite, default JWT; OAuth/LLM disabled or fallback |
| `*.db` / `edualign.db` | Local SQLite DB | Created automatically on first run (same on Windows, macOS, Linux) |
| `data/raw/*.csv` | Large raw data | Not needed if `data/cleaned/colleges_merged.csv` (or `colleges_trimmed.csv`) is committed; otherwise matching returns empty until you add data or run the pipeline |
| `frontend/node_modules/`, `frontend/dist/` | Dependencies and build output | Restored by `npm install`; built by `npm run build` |

**Developers:** Copy `.env.example` to `.env` and fill in values for Google/Apple login, GROQ/GEMINI, and optional `EDUALIGN_DEBUG=1` for detailed 500 errors. Paths (DB, data) use cross-OS handling so the same repo works on Windows and Apple (and Linux).

## Deploy

- Build frontend: `cd frontend && npm run build` → serve `frontend/dist/` (or point your backend at it).
- Backend: run `uvicorn main:app --host 0.0.0.0` (and add your frontend origin to CORS in `main.py` if needed).
