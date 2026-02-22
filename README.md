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

## Deploy

- Build frontend: `cd frontend && npm run build` → serve `frontend/dist/` (or point your backend at it).
- Backend: run `uvicorn main:app --host 0.0.0.0` (and add your frontend origin to CORS in `main.py` if needed).
