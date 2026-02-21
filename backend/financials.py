"""
Financial planning module for EduAlign.

Calculates semester costs, graduation plans, budget feasibility,
and finds alternative colleges within a student's budget.
"""

import math

import pandas as pd

from backend.preprocessing import load_merged_data


def _load_colleges() -> pd.DataFrame:
    return load_merged_data()


def estimate_semester_cost(
    unitid: int,
    in_state: bool = True,
    on_campus: bool = True,
) -> dict:
    """
    Estimate per-semester and total annual cost for a college.

    Returns dict with tuition, housing, books, other, semester_total, annual_total.
    Missing values are returned as None.
    """
    df = _load_colleges()
    row = df[df["UNITID"] == unitid]
    if row.empty:
        return {"error": f"College with UNITID {unitid} not found"}
    row = row.iloc[0]

    tuition = row["TUITIONFEE_IN"] if in_state else row["TUITIONFEE_OUT"]
    housing = row["ROOMBOARD_ON"] if on_campus else row.get("ROOMBOARD_OFF")
    books = row.get("BOOKSUPPLY")
    other = row.get("OTHEREXPENSE_ON")

    def safe(val):
        if pd.isna(val):
            return None
        return float(val)

    tuition = safe(tuition)
    housing = safe(housing)
    books = safe(books)
    other = safe(other)

    components = [tuition, housing, books, other]
    annual = sum(c for c in components if c is not None)
    semester = annual / 2 if annual else None

    return {
        "college_name": row["INSTNM"],
        "unitid": int(unitid),
        "in_state": in_state,
        "on_campus": on_campus,
        "tuition": tuition,
        "housing": housing,
        "books": books,
        "other": other,
        "annual_total": annual,
        "semester_total": semester,
    }


def graduation_plan(
    unitid: int,
    budget_per_semester: float,
    total_savings: float,
    in_state: bool = True,
    on_campus: bool = True,
    degree_years: int = 4,
) -> dict:
    """
    Calculate whether a student can graduate on time and what it takes.

    Returns graduation feasibility, timeline, and savings targets.
    """
    costs = estimate_semester_cost(unitid, in_state, on_campus)
    if "error" in costs:
        return costs

    semester_cost = costs["semester_total"]
    if semester_cost is None:
        return {"error": "Insufficient cost data for this college"}

    total_semesters = degree_years * 2
    total_cost = semester_cost * total_semesters
    remaining = total_cost - total_savings
    can_afford = total_savings >= total_cost

    affordable_semesters = math.floor(total_savings / semester_cost) if semester_cost > 0 else 0
    semesters_short = max(0, total_semesters - affordable_semesters)

    months_until_start = 6
    monthly_savings_needed = (
        remaining / months_until_start if remaining > 0 else 0
    )

    return {
        **costs,
        "degree_years": degree_years,
        "total_semesters": total_semesters,
        "total_cost": total_cost,
        "total_savings": total_savings,
        "remaining_to_fund": max(0, remaining),
        "can_graduate_on_time": can_afford,
        "affordable_semesters": min(affordable_semesters, total_semesters),
        "semesters_short": semesters_short,
        "estimated_graduation_years": (
            degree_years if can_afford
            else math.ceil(affordable_semesters / 2)
        ),
        "monthly_savings_needed": monthly_savings_needed,
    }


def find_alternatives(
    budget_per_semester: float,
    state: str = None,
    in_state: bool = True,
    limit: int = 10,
) -> pd.DataFrame:
    """Find colleges where semester cost fits within budget, sorted by quality."""
    df = _load_colleges()

    tuition_col = "TUITIONFEE_IN" if in_state else "TUITIONFEE_OUT"
    cost_cols = [tuition_col, "ROOMBOARD_OFF", "BOOKSUPPLY", "OTHEREXPENSE_ON"]

    for c in cost_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    df["_est_annual"] = df[cost_cols].sum(axis=1, min_count=1)
    df["_est_semester"] = df["_est_annual"] / 2

    affordable = df[df["_est_semester"] <= budget_per_semester].copy()

    if state:
        affordable = affordable[affordable["STABBR"] == state.upper()]

    df["C150_4"] = pd.to_numeric(df["C150_4"], errors="coerce")
    df["MD_EARN_WNE_P10"] = pd.to_numeric(df["MD_EARN_WNE_P10"], errors="coerce")

    affordable = affordable.sort_values("_est_semester", ascending=True)

    result = affordable[
        ["UNITID", "INSTNM", "CITY", "STABBR", "_est_semester", "C150_4", "MD_EARN_WNE_P10"]
    ].head(limit)

    return result.rename(columns={
        "_est_semester": "est_semester_cost",
    }).reset_index(drop=True)


def budget_tracker(
    total_cost: float,
    semesters_completed: int,
    total_semesters: int,
    amount_spent: float,
) -> dict:
    """Track spending progress toward graduation."""
    expected_spend = (semesters_completed / total_semesters) * total_cost
    remaining = total_cost - amount_spent
    semesters_left = total_semesters - semesters_completed
    per_semester_remaining = remaining / semesters_left if semesters_left > 0 else 0

    return {
        "total_cost": total_cost,
        "amount_spent": amount_spent,
        "remaining": remaining,
        "semesters_completed": semesters_completed,
        "semesters_left": semesters_left,
        "per_semester_remaining": per_semester_remaining,
        "expected_spend_so_far": expected_spend,
        "on_track": amount_spent <= expected_spend * 1.05,
        "over_under": amount_spent - expected_spend,
    }


if __name__ == "__main__":
    plan = graduation_plan(
        unitid=139755,  # Georgia Tech
        budget_per_semester=15000,
        total_savings=50000,
        in_state=True,
    )
    print("Graduation plan for Georgia Tech (in-state):")
    for k, v in plan.items():
        print(f"  {k}: {v}")
