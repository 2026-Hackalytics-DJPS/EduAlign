"""
FastAPI backend for EduAlign.
"""

from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.auth import router as auth_router
from backend.colleges import EXPERIENCE_DIMS, get_matches, load_merged_data
from backend.database import init_db
from backend.financials import (
    budget_tracker,
    estimate_semester_cost,
    find_alternatives,
    graduation_plan,
)

app = FastAPI(title="EduAlign API", version="0.1.0")

# Auth: signup, login, Google login
app.include_router(auth_router)


@app.on_event("startup")
def startup():
    init_db()

_colleges_df = None


def _get_colleges():
    global _colleges_df
    if _colleges_df is None:
        _colleges_df = load_merged_data()
    return _colleges_df


# ── Request / Response Models ────────────────────────────────────────────────


class MatchRequest(BaseModel):
    preferences: dict
    top_n: int = 4


class FinancialPlanRequest(BaseModel):
    unitid: int
    budget_per_semester: float
    total_savings: float
    in_state: bool = True
    on_campus: bool = True
    degree_years: int = 4


class AlternativesRequest(BaseModel):
    budget_per_semester: float
    state: Optional[str] = None
    in_state: bool = True
    limit: int = 10


class BudgetTrackerRequest(BaseModel):
    total_cost: float
    semesters_completed: int
    total_semesters: int
    amount_spent: float


class CompareRequest(BaseModel):
    unitids: list[int]
    in_state: bool = True
    on_campus: bool = True


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.post("/api/match")
def api_match(req: MatchRequest):
    for dim in EXPERIENCE_DIMS:
        if dim not in req.preferences:
            raise HTTPException(400, f"Missing dimension: {dim}")
    result = get_matches(req.preferences, req.top_n)
    return {"matches": result["matches"]}


@app.get("/api/colleges")
def api_colleges(search: str = "", state: str = "", limit: int = 50):
    df = _get_colleges()
    if search:
        df = df[df["INSTNM"].str.contains(search, case=False, na=False)]
    if state:
        df = df[df["STABBR"] == state.upper()]
    subset = df.head(limit)
    return subset[
        ["UNITID", "INSTNM", "CITY", "STABBR", "CONTROL", "UGDS", "TUITIONFEE_IN", "TUITIONFEE_OUT"]
    ].to_dict(orient="records")


@app.get("/api/colleges/{unitid}")
def api_college_detail(unitid: int):
    df = _get_colleges()
    row = df[df["UNITID"] == unitid]
    if row.empty:
        raise HTTPException(404, "College not found")
    return row.iloc[0].to_dict()


@app.post("/api/financial-plan")
def api_financial_plan(req: FinancialPlanRequest):
    result = graduation_plan(
        unitid=req.unitid,
        budget_per_semester=req.budget_per_semester,
        total_savings=req.total_savings,
        in_state=req.in_state,
        on_campus=req.on_campus,
        degree_years=req.degree_years,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result


@app.post("/api/alternatives")
def api_alternatives(req: AlternativesRequest):
    df = find_alternatives(
        budget_per_semester=req.budget_per_semester,
        state=req.state,
        in_state=req.in_state,
        limit=req.limit,
    )
    return df.to_dict(orient="records")


@app.post("/api/budget-tracker")
def api_budget_tracker(req: BudgetTrackerRequest):
    return budget_tracker(
        total_cost=req.total_cost,
        semesters_completed=req.semesters_completed,
        total_semesters=req.total_semesters,
        amount_spent=req.amount_spent,
    )


@app.post("/api/compare")
def api_compare(req: CompareRequest):
    results = []
    for uid in req.unitids:
        cost = estimate_semester_cost(uid, req.in_state, req.on_campus)
        if "error" not in cost:
            results.append(cost)
    return results
