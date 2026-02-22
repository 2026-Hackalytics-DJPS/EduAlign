"""
LLM-powered matching engine for EduAlign.

Sends student preferences and college alumni profiles to Google Gemini,
which reasons about the best matches and returns structured results
with natural language explanations. Falls back to cosine similarity
when the Gemini API is unavailable or quota is exhausted.
"""

import json
import os

import numpy as np
import google.generativeai as genai
import pandas as pd
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity

from backend.colleges.preprocessing import EXPERIENCE_DIMS, load_merged_data

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = genai.GenerativeModel("gemini-2.0-flash-lite")

_cache: dict[str, dict] = {}

SYSTEM_PROMPT = """You are EduAlign's college matching engine. You receive:
1. A student profile (GPA, major/interest, location, extracurriculars, preferences)
2. A student's experience preferences (rated 1-10 across 8 dimensions)
3. Profiles of colleges with alumni-reported experience ratings (normalized 0-1)

Your job:
- Reason holistically about which colleges best align with the student — consider
  their academic background, interests, and location alongside the experience dimensions.
- Consider trade-offs (e.g., a college may excel in career support but lack social life).
- Return EXACTLY the top 4 best-fit colleges.

You MUST respond with valid JSON only — no markdown, no commentary outside the JSON.
Use this exact schema:

{
  "matches": [
    {
      "college_name": "...",
      "similarity_score": 0.0-1.0,
      "explanation": "2-3 sentence explanation of why this is a good match and any trade-offs",
      "strengths": ["dimension1", "dimension2"],
      "tradeoffs": ["dimension3"]
    }
  ]
}

Order matches from best fit (#1) to #4. similarity_score should reflect overall alignment
where 1.0 is a perfect match. Be honest about trade-offs in the explanation."""


def _build_prompt(student_vector: dict, candidates: pd.DataFrame, profile: dict | None = None) -> str:
    """Build the prompt with student profile, prefs, and college profiles."""
    parts = []

    if profile:
        profile_lines = []
        if profile.get("gpa"):
            profile_lines.append(f"  GPA: {profile['gpa']}")
        if profile.get("major"):
            profile_lines.append(f"  Area of interest / Major: {profile['major']}")
        if profile.get("location"):
            profile_lines.append(f"  Current location: {profile['location']}")
        if profile.get("extracurriculars"):
            profile_lines.append(f"  Sports & Extracurriculars: {profile['extracurriculars']}")
        if profile.get("in_state_preference") is not None:
            pref = "in-state" if profile["in_state_preference"] else "out-of-state"
            profile_lines.append(f"  Tuition preference: {pref}")
        if profile.get("free_text"):
            profile_lines.append(f"  What they want: {profile['free_text']}")
        if profile_lines:
            parts.append("Student profile:\n" + "\n".join(profile_lines))

    dim_lines = "\n".join(f"  {dim}: {val}/10" for dim, val in student_vector.items())
    parts.append(f"Experience preferences (1-10 scale):\n{dim_lines}")

    college_blocks = []
    for _, row in candidates.iterrows():
        dims = ", ".join(f"{d}: {row[d]:.2f}" for d in EXPERIENCE_DIMS)
        college_blocks.append(f"- {row['INSTNM']} ({row['CITY']}, {row['STABBR']}): {dims}")
    parts.append(
        "Available colleges with alumni experience profiles (0-1 normalized scale):\n"
        + "\n".join(college_blocks)
    )

    parts.append("Return the top 4 best matches as JSON.")
    return "\n\n".join(parts)


def _cosine_fallback(student_vector: dict, candidates: pd.DataFrame, top_n: int = 4) -> list[dict]:
    """Pure math fallback when Gemini is unavailable."""
    candidates = candidates.dropna(subset=EXPERIENCE_DIMS)
    if candidates.empty:
        return []
    student_arr = np.array([student_vector[d] / 10.0 for d in EXPERIENCE_DIMS]).reshape(1, -1)
    college_arr = candidates[EXPERIENCE_DIMS].values
    scores = cosine_similarity(student_arr, college_arr).flatten()
    top_idx = scores.argsort()[::-1][:top_n]

    matches = []
    for idx in top_idx:
        row = candidates.iloc[idx]
        score = float(scores[idx])
        profile = {d: float(row[d]) for d in EXPERIENCE_DIMS}

        best_dims = sorted(EXPERIENCE_DIMS, key=lambda d: profile[d], reverse=True)[:3]
        weak_dims = [d for d in EXPERIENCE_DIMS if profile[d] < (student_vector[d] / 10.0) - 0.2]

        matches.append({
            "college_name": row["INSTNM"],
            "UNITID": int(row["UNITID"]),
            "similarity_score": round(score, 4),
            "explanation": (
                f"{row['INSTNM']} has a {score:.0%} alignment with your preferences. "
                f"Strongest areas: {', '.join(d.replace('_', ' ') for d in best_dims)}."
                + (f" Potential gaps: {', '.join(d.replace('_', ' ') for d in weak_dims[:2])}." if weak_dims else "")
            ),
            "strengths": best_dims,
            "tradeoffs": weak_dims[:3] if weak_dims else [],
            **profile,
        })
    return matches


def _cache_key(student_vector: dict, profile: dict | None, top_n: int) -> str:
    """Create a hashable key for the in-memory cache."""
    return json.dumps({"v": sorted(student_vector.items()), "p": sorted((profile or {}).items()), "n": top_n})


def get_matches(student_vector: dict, top_n: int = 4, profile: dict | None = None) -> dict:
    """
    Match a student's preferences against college alumni profiles.
    Uses Gemini for rich explanations; falls back to cosine similarity
    if the API is unavailable or quota is exhausted. Results are cached
    in memory to avoid redundant API calls.

    Parameters
    ----------
    student_vector : dict
        Keys are the 8 experience dimension names, values are 1-10 ints.
    top_n : int
        Number of top matches to return.
    profile : dict, optional
        Student profile with keys: gpa, major, location, extracurriculars,
        in_state_preference (bool), free_text.

    Returns
    -------
    dict with keys:
        "matches": list of dicts with college_name, UNITID, similarity_score,
                   explanation, strengths, tradeoffs, + 8 dimension scores
        "raw_profiles": DataFrame of the candidate colleges (for charts)
        "used_fallback": bool indicating whether cosine fallback was used
    """
    key = _cache_key(student_vector, profile, top_n)
    if key in _cache:
        return _cache[key]

    merged = load_merged_data()
    candidates = merged[merged[EXPERIENCE_DIMS[0]].notna()].copy()

    if candidates.empty:
        return {"matches": [], "raw_profiles": pd.DataFrame(), "used_fallback": False}

    try:
        prompt = _build_prompt(student_vector, candidates, profile)
        response = MODEL.generate_content(
            SYSTEM_PROMPT + "\n\n" + prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        result = json.loads(response.text)
        matched_names = [m["college_name"] for m in result["matches"]]
        profiles = candidates[candidates["INSTNM"].isin(matched_names)].copy()

        enriched_matches = []
        for match in result["matches"][:top_n]:
            profile_row = profiles[profiles["INSTNM"] == match["college_name"]]
            if not profile_row.empty:
                row = profile_row.iloc[0]
                match["UNITID"] = int(row["UNITID"])
                for dim in EXPERIENCE_DIMS:
                    match[dim] = float(row[dim])
            enriched_matches.append(match)

        out = {
            "matches": enriched_matches,
            "raw_profiles": profiles,
            "used_fallback": False,
        }
        _cache[key] = out
        return out

    except Exception as e:
        print(f"Gemini unavailable ({e}), using cosine similarity fallback")
        fallback_matches = _cosine_fallback(student_vector, candidates, top_n)
        matched_names = [m["college_name"] for m in fallback_matches]
        profiles = candidates[candidates["INSTNM"].isin(matched_names)].copy()
        out = {
            "matches": fallback_matches,
            "raw_profiles": profiles,
            "used_fallback": True,
        }
        _cache[key] = out
        return out


if __name__ == "__main__":
    sample_prefs = {
        "academic_intensity": 7,
        "social_life": 8,
        "inclusivity": 9,
        "career_support": 6,
        "collaboration_vs_competition": 7,
        "mental_health_culture": 8,
        "campus_safety": 8,
        "overall_satisfaction": 8,
    }

    sample_profile = {
        "gpa": 3.7,
        "major": "Computer Science",
        "location": "Georgia",
        "extracurriculars": "Tennis, hackathons",
        "free_text": "I want a collaborative campus with strong tech culture",
    }

    print("Matching...\n")
    result = get_matches(sample_prefs, profile=sample_profile)

    if result["used_fallback"]:
        print("⚡ Used cosine similarity fallback (Gemini unavailable)\n")
    else:
        print("✓ Used Gemini LLM matching\n")

    for i, match in enumerate(result["matches"]):
        print(f"#{i + 1}  {match['college_name']}")
        print(f"    Score: {match['similarity_score']}")
        print(f"    Why: {match['explanation']}")
        print(f"    UNITID: {match.get('UNITID', 'N/A')}")
        print(f"    Strengths: {match['strengths']}")
        print(f"    Tradeoffs: {match['tradeoffs']}")
        for dim in EXPERIENCE_DIMS:
            if dim in match:
                print(f"    {dim}: {match[dim]:.3f}")
        print()
