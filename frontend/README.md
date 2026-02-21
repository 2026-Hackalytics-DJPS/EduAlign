# EduAlign React Frontend

React (Vite + TypeScript) frontend for EduAlign. Replaces the Streamlit app with a modern SPA that talks to the FastAPI backend.

## Features

- **Find Your Match** — Sliders for 8 experience dimensions → POST `/api/match` → top 4 matches with radar charts (Plotly.js)
- **Financial Planner** — College selector, in-state/on-campus toggles, degree length, budget/savings → graduation plan, cost bar chart, alternatives table, budget tracker
- **Compare Colleges** — Multi-select 2–4 colleges → experience radar comparison + financial grouped bar chart + key metrics

Charts use **react-plotly.js** (Plotly.js under the hood), matching the former Python Plotly behavior.

## Setup

```bash
cd frontend
npm install
```

## Run (dev)

With the FastAPI backend running on port 8000:

```bash
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:8000`.

## Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static host or point your backend at `dist/index.html` for production.

## Stack

- React 18, TypeScript, Vite 5
- react-router-dom (routes)
- react-plotly.js + plotly.js (radar, bar, grouped bar charts)
