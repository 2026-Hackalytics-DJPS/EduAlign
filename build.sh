#!/usr/bin/env bash
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Build React frontend
cd frontend
npm install
npm run build
cd ..

# Initialize DB and seed reviews
python3 -c "from backend.database import init_db, run_migrations; init_db(); run_migrations()"
python3 seed_reviews.py
