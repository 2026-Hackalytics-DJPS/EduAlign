"""
Predictions engine for EduAlign.

Data-driven predictions (admission, earnings, graduation) from College
Scorecard statistics, plus Gemini-powered narrative synthesis and
profile-to-slider suggestion mapping.
"""

import json
import math
import os
import re

import numpy as np
import pandas as pd
from dotenv import load_dotenv

from backend.colleges.preprocessing import EXPERIENCE_DIMS, load_merged_data

load_dotenv()

try:
    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    MODEL = genai.GenerativeModel("gemini-2.0-flash-lite")
except Exception:
    genai = None
    MODEL = None

# Rough GPA-to-SAT mapping (used when student provides GPA but no SAT)
_GPA_TO_SAT = [
    (4.0, 1550), (3.9, 1500), (3.8, 1450), (3.7, 1400),
    (3.5, 1300), (3.3, 1200), (3.0, 1100), (2.7, 1000),
    (2.5, 950),  (2.0, 880),
]

# Median earnings across all colleges for percentile context
_EARNINGS_CACHE: dict = {}


def _gpa_to_sat(gpa: float) -> int:
    """Estimate SAT score from GPA using a simple lookup."""
    for threshold, sat in _GPA_TO_SAT:
        if gpa >= threshold:
            return sat
    return 850


def _safe_float(val) -> float | None:
    if pd.isna(val):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _earnings_percentile(earnings: float, df: pd.DataFrame) -> int:
    """Compute percentile rank of a college's median earnings."""
    if "all_earnings" not in _EARNINGS_CACHE:
        _EARNINGS_CACHE["all_earnings"] = pd.to_numeric(
            df["MD_EARN_WNE_P10"], errors="coerce"
        ).dropna().values
    all_e = _EARNINGS_CACHE["all_earnings"]
    if len(all_e) == 0:
        return 50
    return int(round((np.sum(all_e < earnings) / len(all_e)) * 100))


# ── Data-driven predictions ─────────────────────────────────────────────────


def predict_admission(profile: dict, college_row: pd.Series) -> dict:
    """
    Estimate admission chance by comparing student SAT/GPA against
    the college's average SAT and admission rate.
    """
    adm_rate = _safe_float(college_row.get("ADM_RATE"))
    sat_avg = _safe_float(college_row.get("SAT_AVG"))

    student_sat = profile.get("sat")
    if not student_sat and profile.get("gpa"):
        student_sat = _gpa_to_sat(profile["gpa"])

    if adm_rate is None:
        return {"chance": None, "category": "Unknown", "note": "Admission rate data not available"}

    # Base chance from admission rate
    base_chance = adm_rate

    if student_sat and sat_avg:
        sat_diff = student_sat - sat_avg
        if sat_diff >= 100:
            multiplier = min(1.4, 1.0 + sat_diff / 500)
        elif sat_diff >= 0:
            multiplier = 1.0 + sat_diff / 800
        elif sat_diff >= -150:
            multiplier = max(0.5, 1.0 + sat_diff / 400)
        else:
            multiplier = max(0.25, 1.0 + sat_diff / 300)
        chance = max(0.02, min(0.99, base_chance * multiplier))
    else:
        chance = base_chance

    if chance >= 0.60:
        category = "Safety"
    elif chance >= 0.30:
        category = "Match"
    else:
        category = "Reach"

    note_parts = [f"Admission rate: {adm_rate:.0%}"]
    if student_sat and sat_avg:
        diff = student_sat - sat_avg
        direction = "above" if diff >= 0 else "below"
        note_parts.append(f"Your SAT is ~{abs(diff):.0f} points {direction} the school average ({sat_avg:.0f})")

    return {
        "chance": round(chance, 3),
        "category": category,
        "note": ". ".join(note_parts),
    }


def predict_earnings(profile: dict, college_row: pd.Series, df: pd.DataFrame) -> dict:
    """
    Return median earnings 10 years post-entry with percentile context.
    """
    earnings = _safe_float(college_row.get("MD_EARN_WNE_P10"))
    if earnings is None:
        return {"median_10yr": None, "percentile": None, "note": "Earnings data not available"}

    pctile = _earnings_percentile(earnings, df)

    note = f"${earnings:,.0f} median earnings 10 years after enrollment (top {100 - pctile}% nationally)"
    if profile.get("major"):
        note += f". Note: this is the school-wide median; {profile['major']} graduates may differ."

    return {
        "median_10yr": earnings,
        "percentile": pctile,
        "note": note,
    }


def predict_graduation(profile: dict, college_row: pd.Series) -> dict:
    """
    Estimate graduation probability from completion rate, retention rate,
    and student GPA.
    """
    completion = _safe_float(college_row.get("C150_4"))
    retention = _safe_float(college_row.get("RET_FT4"))

    if completion is None and retention is None:
        return {"probability": None, "note": "Graduation data not available"}

    # Weighted combination: completion rate is primary, retention is signal
    if completion is not None and retention is not None:
        base = completion * 0.7 + retention * 0.3
    elif completion is not None:
        base = completion
    else:
        base = retention * 0.85

    # GPA adjustment: higher GPA students graduate at higher rates
    gpa = profile.get("gpa")
    if gpa:
        gpa_boost = (gpa - 3.0) * 0.05  # +/-5% per GPA point from 3.0
        base = max(0.05, min(0.99, base + gpa_boost))

    note_parts = []
    if completion is not None:
        note_parts.append(f"{completion:.0%} 4-year completion rate")
    if retention is not None:
        note_parts.append(f"{retention:.0%} first-year retention")
    if gpa and gpa >= 3.5:
        note_parts.append("your strong GPA improves your odds")

    return {
        "probability": round(base, 3),
        "note": ". ".join(note_parts) if note_parts else "Based on available data",
    }


# ── Slider suggestion ───────────────────────────────────────────────────────

_MAJOR_PROFILES: dict[str, dict[str, int]] = {
    "computer science": {"academic_intensity": 8, "career_support": 9, "collaboration_vs_competition": 7, "social_life": 5},
    "engineering": {"academic_intensity": 9, "career_support": 8, "collaboration_vs_competition": 6, "mental_health_culture": 6},
    "business": {"academic_intensity": 6, "career_support": 9, "social_life": 7, "collaboration_vs_competition": 5},
    "pre-med": {"academic_intensity": 10, "career_support": 7, "collaboration_vs_competition": 4, "mental_health_culture": 8},
    "arts": {"academic_intensity": 5, "social_life": 8, "inclusivity": 8, "mental_health_culture": 7},
    "humanities": {"academic_intensity": 6, "social_life": 7, "inclusivity": 8, "collaboration_vs_competition": 7},
    "nursing": {"academic_intensity": 8, "career_support": 9, "campus_safety": 8, "mental_health_culture": 7},
    "education": {"academic_intensity": 5, "career_support": 7, "inclusivity": 8, "collaboration_vs_competition": 8},
    "biology": {"academic_intensity": 8, "career_support": 7, "collaboration_vs_competition": 5},
    "psychology": {"academic_intensity": 6, "inclusivity": 8, "mental_health_culture": 9, "social_life": 7},
}

_KEYWORD_BOOSTS: list[tuple[str, str, int]] = [
    ("collaborat", "collaboration_vs_competition", 9),
    ("competiti", "collaboration_vs_competition", 3),
    ("safe", "campus_safety", 9),
    ("divers", "inclusivity", 9),
    ("inclusi", "inclusivity", 9),
    ("social", "social_life", 9),
    ("party", "social_life", 9),
    ("mental health", "mental_health_culture", 9),
    ("wellness", "mental_health_culture", 8),
    ("career", "career_support", 9),
    ("intern", "career_support", 9),
    ("job", "career_support", 8),
    ("research", "academic_intensity", 9),
    ("rigorous", "academic_intensity", 9),
    ("prestige", "overall_satisfaction", 8),
    ("chill", "academic_intensity", 4),
    ("relax", "mental_health_culture", 8),
]


def suggest_sliders(profile: dict) -> dict[str, int]:
    """
    Map student profile to suggested experience slider values (1-10).
    Uses major, extracurriculars, and free text to infer preferences.
    """
    defaults = {dim: 6 for dim in EXPERIENCE_DIMS}

    major = (profile.get("major") or "").lower().strip()
    for key, overrides in _MAJOR_PROFILES.items():
        if key in major:
            defaults.update(overrides)
            break

    extras = (profile.get("extracurriculars") or "").lower()
    if any(w in extras for w in ["sport", "tennis", "soccer", "basketball", "athlete", "swim", "track"]):
        defaults["social_life"] = max(defaults["social_life"], 8)
        defaults["campus_safety"] = max(defaults["campus_safety"], 7)
    if any(w in extras for w in ["hackathon", "coding", "robotics", "tech"]):
        defaults["career_support"] = max(defaults["career_support"], 8)
        defaults["academic_intensity"] = max(defaults["academic_intensity"], 7)
    if any(w in extras for w in ["volunteer", "community", "service"]):
        defaults["inclusivity"] = max(defaults["inclusivity"], 8)
    if any(w in extras for w in ["theater", "music", "art", "dance"]):
        defaults["social_life"] = max(defaults["social_life"], 8)
        defaults["inclusivity"] = max(defaults["inclusivity"], 7)

    free_text = (profile.get("free_text") or "").lower()
    for keyword, dim, val in _KEYWORD_BOOSTS:
        if keyword in free_text:
            defaults[dim] = val

    # GPA influence: higher GPA students tend to value academics
    gpa = profile.get("gpa")
    if gpa and gpa >= 3.7:
        defaults["academic_intensity"] = max(defaults["academic_intensity"], 7)
    elif gpa and gpa < 2.8:
        defaults["academic_intensity"] = min(defaults["academic_intensity"], 5)

    return {dim: max(1, min(10, defaults[dim])) for dim in EXPERIENCE_DIMS}


# ── Gemini narrative ─────────────────────────────────────────────────────────

_NARRATIVE_PROMPT = """You are EduAlign's prediction advisor. You receive a student profile
and data-driven predictions for several colleges. Write a concise 2-3 sentence narrative
for EACH college that synthesizes the admission chance, expected earnings, and graduation
probability into personalized advice. Be honest about risks and opportunities.

You MUST respond with valid JSON only:
{
  "narratives": [
    {"college_name": "...", "narrative": "2-3 sentences of personalized advice"}
  ]
}"""


def predict_with_narrative(profile: dict, predictions: list[dict]) -> list[dict]:
    """
    Send data-driven predictions to Gemini for narrative synthesis.
    Falls back to data-only notes if Gemini is unavailable.
    """
    profile_desc = []
    if profile.get("gpa"):
        profile_desc.append(f"GPA: {profile['gpa']}")
    if profile.get("sat"):
        profile_desc.append(f"SAT: {profile['sat']}")
    if profile.get("major"):
        profile_desc.append(f"Major: {profile['major']}")
    if profile.get("location"):
        profile_desc.append(f"Location: {profile['location']}")
    if profile.get("extracurriculars"):
        profile_desc.append(f"Activities: {profile['extracurriculars']}")
    if profile.get("free_text"):
        profile_desc.append(f"Preference: {profile['free_text']}")

    college_summaries = []
    for p in predictions:
        adm = p.get("admission", {})
        earn = p.get("earnings", {})
        grad = p.get("graduation", {})
        college_summaries.append(
            f"- {p['INSTNM']}: admission {adm.get('category', 'N/A')} ({adm.get('chance', 'N/A')}), "
            f"earnings ${earn.get('median_10yr', 'N/A'):,}/yr, "
            f"graduation {grad.get('probability', 'N/A')}"
        )

    prompt = (
        f"Student: {', '.join(profile_desc)}\n\n"
        f"Predictions:\n" + "\n".join(college_summaries)
        + "\n\nWrite a narrative for each college."
    )

    if MODEL is None or genai is None:
        for p in predictions:
            p["narrative"] = _fallback_narrative(p)
        return predictions
    try:
        response = MODEL.generate_content(
            _NARRATIVE_PROMPT + "\n\n" + prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        result = json.loads(response.text)
        name_to_narrative = {n["college_name"]: n["narrative"] for n in result.get("narratives", [])}

        for p in predictions:
            p["narrative"] = name_to_narrative.get(p["INSTNM"], _fallback_narrative(p))
        return predictions

    except Exception as e:
        print(f"Gemini narrative unavailable ({e}), using data-only notes")
        for p in predictions:
            p["narrative"] = _fallback_narrative(p)
        return predictions


def _fallback_narrative(pred: dict) -> str:
    """Build a narrative from data-driven predictions when Gemini is unavailable."""
    parts = []
    adm = pred.get("admission", {})
    if adm.get("category"):
        parts.append(f"{pred['INSTNM']} is a {adm['category'].lower()} school for you")
        if adm.get("chance"):
            parts[-1] += f" with an estimated {adm['chance']:.0%} admission chance"

    earn = pred.get("earnings", {})
    if earn.get("median_10yr"):
        parts.append(f"graduates earn a median of ${earn['median_10yr']:,.0f} after 10 years")

    grad = pred.get("graduation", {})
    if grad.get("probability"):
        parts.append(f"the estimated on-time graduation probability is {grad['probability']:.0%}")

    return ". ".join(parts) + "." if parts else "Insufficient data for a prediction."


# ── Orchestrator ─────────────────────────────────────────────────────────────


def get_predictions(profile: dict, unitids: list[int]) -> dict:
    """
    Run all predictions for a list of colleges given a student profile.

    Returns dict with 'predictions' list, 'suggested_sliders', and 'used_fallback'.
    """
    df = load_merged_data()
    predictions = []
    used_narrative_fallback = False

    for unitid in unitids:
        row = df[df["UNITID"] == unitid]
        if row.empty:
            predictions.append({
                "UNITID": unitid,
                "INSTNM": "Unknown",
                "admission": {"chance": None, "category": "Unknown", "note": "College not found"},
                "earnings": {"median_10yr": None, "percentile": None, "note": "College not found"},
                "graduation": {"probability": None, "note": "College not found"},
                "narrative": "College not found in our database.",
            })
            continue

        college = row.iloc[0]
        pred = {
            "UNITID": int(unitid),
            "INSTNM": college["INSTNM"],
            "admission": predict_admission(profile, college),
            "earnings": predict_earnings(profile, college, df),
            "graduation": predict_graduation(profile, college),
        }
        predictions.append(pred)

    predictions = predict_with_narrative(profile, predictions)

    sliders = suggest_sliders(profile)

    return {
        "predictions": predictions,
        "suggested_sliders": sliders,
        "used_fallback": any(
            "data-only" in p.get("narrative", "").lower()
            or "insufficient" in p.get("narrative", "").lower()
            for p in predictions
        ),
    }


if __name__ == "__main__":
    sample_profile = {
        "gpa": 3.7,
        "sat": 1350,
        "major": "Computer Science",
        "location": "Georgia",
        "extracurriculars": "Tennis, hackathons",
        "free_text": "I want a collaborative campus with strong tech culture",
    }
    sample_unitids = [130794, 199120, 171100, 198419]  # Yale, UNC, Michigan, Duke

    print("Running predictions...\n")
    result = get_predictions(sample_profile, sample_unitids)

    print(f"Suggested sliders: {result['suggested_sliders']}\n")

    for p in result["predictions"]:
        print(f"--- {p['INSTNM']} (UNITID: {p['UNITID']}) ---")
        adm = p["admission"]
        print(f"  Admission: {adm['category']} ({adm.get('chance', 'N/A')})")
        print(f"    {adm['note']}")
        earn = p["earnings"]
        print(f"  Earnings: ${earn.get('median_10yr', 'N/A'):,}" if earn.get("median_10yr") else "  Earnings: N/A")
        print(f"    {earn['note']}")
        grad = p["graduation"]
        print(f"  Graduation: {grad.get('probability', 'N/A')}")
        print(f"    {grad['note']}")
        print(f"  Narrative: {p.get('narrative', 'N/A')}")
        print()
