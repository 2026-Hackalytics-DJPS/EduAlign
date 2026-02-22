"""
Matching engine for EduAlign.

1. Pre-filters colleges using student profile data (state, SAT range)
   to shrink the candidate pool and save LLM tokens.
2. Ranks remaining candidates via weighted cosine similarity.
3. Sends a shortlist (~15 colleges) to Groq's LLM for rich explanations.
4. Falls back to template-based explanations if Groq is unavailable.
"""

import json
import os
import re
import random
import time

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from groq import Groq
import groq as groq_errors
from sklearn.metrics.pairwise import cosine_similarity

from backend.colleges.preprocessing import EXPERIENCE_DIMS, load_merged_data

_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
load_dotenv(_ENV_PATH)

_groq_client: Groq | None = None


def _get_groq() -> Groq | None:
    """Lazy-init the Groq client. Returns None if no API key is configured."""
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    key = os.getenv("GROQ_API_KEY")
    if not key:
        return None
    _groq_client = Groq(api_key=key)
    return _groq_client

_cache: dict[str, dict] = {}

MIN_CANDIDATES = 30

DIM_LABELS: dict[str, str] = {
    "academic_intensity": "academic rigor",
    "social_life": "social scene",
    "inclusivity": "campus diversity and inclusion",
    "career_support": "career services and job placement",
    "collaboration_vs_competition": "collaborative culture",
    "mental_health_culture": "mental health support",
    "campus_safety": "campus safety",
    "overall_satisfaction": "overall student satisfaction",
}

US_STATES: dict[str, str] = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}

SYSTEM_PROMPT = """You are EduAlign's college matching engine. You receive:
1. A student profile (GPA, major, location, extracurriculars, preferences)
2. Experience preferences rated 1-10 across 8 dimensions
3. A shortlist of ~15 colleges with alumni-reported experience ratings (0-1 scale)

Your job:
- Reason holistically about which colleges best align with the student.
- Consider trade-offs (e.g., strong career support but weaker social life).
- Return EXACTLY the top 4 best-fit colleges.

Return ONLY a raw JSON object. No explanation, no markdown, no code blocks.
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

Order from best fit (#1) to #4. Be honest about trade-offs."""


# ── Helpers ──────────────────────────────────────────────────────────────────

def _resolve_state(location: str) -> str | None:
    """Convert a location string ('Georgia', 'GA', 'Atlanta, GA') to a 2-letter abbreviation."""
    loc = location.strip().lower()
    if loc.upper() in {v for v in US_STATES.values()}:
        return loc.upper()
    if loc in US_STATES:
        return US_STATES[loc]
    for name, abbr in US_STATES.items():
        if name in loc:
            return abbr
    return None


def _profile_affinity(candidates: pd.DataFrame, profile: dict | None) -> np.ndarray:
    """Compute a 0-1 affinity bonus for each candidate based on student profile.

    Scoring (each factor is 0 or 1, then averaged across available factors):
      - state_match:   1 if college is in the student's state
      - sat_proximity:  1 if within ±200, linear decay to 0 at ±400
      - in_state_boost: extra 1 when in_state_preference is on AND state matches
    """
    n = len(candidates)
    if not profile or n == 0:
        return np.zeros(n)

    total = np.zeros(n)
    max_possible = 0.0

    state = _resolve_state(profile["location"]) if profile.get("location") else None
    if state is not None:
        match = (candidates["STABBR"] == state).astype(float).values
        w = 2.0 if profile.get("in_state_preference") else 1.0
        total += match * w
        max_possible += w

    if profile.get("sat"):
        sat = float(profile["sat"])
        sat_vals = candidates["SAT_AVG"].values.copy()
        has_sat = ~np.isnan(sat_vals)
        dist = np.abs(sat_vals - sat)
        proximity = np.clip(1.0 - (dist - 200) / 200, 0.0, 1.0)
        proximity[~has_sat] = 0.5
        total += proximity
        max_possible += 1.0

    if max_possible == 0.0:
        return np.zeros(n)

    return total / max_possible


def _composite_scores(student_vector: dict, candidates: pd.DataFrame,
                      profile: dict | None = None,
                      affinity_weight: float = 0.20) -> np.ndarray:
    """Blend weighted cosine similarity with profile affinity.

    final = (1 - affinity_weight) * cosine + affinity_weight * affinity

    With default 0.20, experience dimensions drive 80% of the score and
    profile data (location, SAT) drives 20%.
    """
    student_norm = np.array([student_vector[d] / 10.0 for d in EXPERIENCE_DIMS])
    weights = np.array([student_vector[d] for d in EXPERIENCE_DIMS], dtype=float)

    weighted_student = (student_norm * weights).reshape(1, -1)
    weighted_colleges = candidates[EXPERIENCE_DIMS].values * weights.reshape(1, -1)
    cosine = cosine_similarity(weighted_student, weighted_colleges).flatten()

    affinity = _profile_affinity(candidates, profile)

    return (1.0 - affinity_weight) * cosine + affinity_weight * affinity


def _shortlist(student_vector: dict, candidates: pd.DataFrame,
               n: int = 15, profile: dict | None = None) -> pd.DataFrame:
    """Rank candidates by composite score and return the top *n* for the LLM."""
    clean = candidates.dropna(subset=EXPERIENCE_DIMS)
    if clean.empty or len(clean) <= n:
        return clean

    scores = _composite_scores(student_vector, clean, profile)
    top_idx = scores.argsort()[::-1][:n]
    return clean.iloc[top_idx].copy()


def _build_prompt(student_vector: dict, candidates: pd.DataFrame,
                  profile: dict | None = None) -> str:
    """Assemble the user prompt for the LLM."""
    parts = []

    if profile:
        lines = []
        if profile.get("gpa"):
            lines.append(f"  GPA: {profile['gpa']}")
        if profile.get("sat"):
            lines.append(f"  SAT: {profile['sat']}")
        if profile.get("major"):
            lines.append(f"  Major / Interest: {profile['major']}")
        if profile.get("location"):
            pref = " (prefers in-state)" if profile.get("in_state_preference") else ""
            lines.append(f"  Location: {profile['location']}{pref}")
        if profile.get("extracurriculars"):
            lines.append(f"  Extracurriculars: {profile['extracurriculars']}")
        if profile.get("free_text"):
            lines.append(f"  What they want: {profile['free_text']}")
        if lines:
            parts.append("Student profile:\n" + "\n".join(lines))

    dim_lines = "\n".join(f"  {dim}: {val}/10" for dim, val in student_vector.items())
    parts.append(f"Experience preferences (1-10 scale):\n{dim_lines}")

    blocks = []
    for _, row in candidates.iterrows():
        dims = ", ".join(f"{d}: {row[d]:.2f}" for d in EXPERIENCE_DIMS)
        blocks.append(f"- {row['INSTNM']} ({row['CITY']}, {row['STABBR']}): {dims}")
    parts.append("Colleges (alumni experience profiles, 0-1 normalized):\n" + "\n".join(blocks))

    parts.append(
        "Return the top 4 best matches as JSON. "
        "Return ONLY a raw JSON object — no explanation, no markdown, no code blocks."
    )
    return "\n\n".join(parts)


def _parse_llm_json(raw: str) -> dict:
    """Extract JSON from LLM output, stripping markdown fences if present."""
    cleaned = raw.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if fence:
        cleaned = fence.group(1).strip()
    return json.loads(cleaned)


# ── Cosine fallback explanations ─────────────────────────────────────────────

def _explain(name: str, city: str, state: str, score: float,
             dim_profile: dict, student_vector: dict,
             best_dims: list[str], weak_dims: list[str]) -> str:
    """Build a natural-sounding template explanation for a college match."""
    s1 = DIM_LABELS.get(best_dims[0], best_dims[0])
    s2 = DIM_LABELS.get(best_dims[1], best_dims[1]) if len(best_dims) > 1 else None

    openers = [
        f"With a {score:.0%} match score, {name} in {city}, {state} stands out",
        f"{name} ({city}, {state}) earns a {score:.0%} alignment",
        f"Scoring {score:.0%} overall, {name} in {city}, {state} is a strong fit",
    ]
    opener = random.choice(openers)

    strength = f"for its {s1}" + (f" and {s2}" if s2 else "")

    top_prio = sorted(student_vector.items(), key=lambda x: x[1], reverse=True)[0]
    prio_name = DIM_LABELS.get(top_prio[0], top_prio[0])
    priority_line = (
        f" Given that you prioritize {prio_name}, "
        f"this school delivers well in that area."
    )

    tradeoff_line = ""
    if weak_dims:
        w = DIM_LABELS.get(weak_dims[0], weak_dims[0])
        phrases = [
            f" One consideration: {w} scores below your preference, so weigh that trade-off.",
            f" Worth noting that {w} is a weaker area here relative to your ideal.",
            f" On the flip side, {w} doesn't fully match your expectations.",
        ]
        tradeoff_line = random.choice(phrases)

    return f"{opener} {strength}.{priority_line}{tradeoff_line}"


def _weighted_cosine_match(student_vector: dict, candidates: pd.DataFrame,
                           top_n: int = 4, profile: dict | None = None) -> list[dict]:
    """Composite scoring (cosine + profile affinity) with template explanations."""
    candidates = candidates.dropna(subset=EXPERIENCE_DIMS)
    if candidates.empty:
        return []

    student_norm = np.array([student_vector[d] / 10.0 for d in EXPERIENCE_DIMS])
    raw_scores = _composite_scores(student_vector, candidates, profile)

    top_idx = raw_scores.argsort()[::-1][:top_n]
    top_raw = raw_scores[top_idx]

    s_min, s_max = top_raw.min(), top_raw.max()
    if s_max - s_min > 1e-9:
        scaled = 0.70 + 0.28 * (top_raw - s_min) / (s_max - s_min)
    else:
        scaled = np.full_like(top_raw, 0.85)

    matches = []
    for rank, idx in enumerate(top_idx):
        row = candidates.iloc[idx]
        score = float(scaled[rank])
        dim_profile = {d: float(row[d]) for d in EXPERIENCE_DIMS}

        best_dims = sorted(EXPERIENCE_DIMS, key=lambda d: dim_profile[d], reverse=True)[:3]
        weak_dims = [d for d in EXPERIENCE_DIMS
                     if dim_profile[d] < student_norm[EXPERIENCE_DIMS.index(d)] - 0.2]

        matches.append({
            "college_name": row["INSTNM"],
            "UNITID": int(row["UNITID"]),
            "similarity_score": round(score, 4),
            "explanation": _explain(
                row["INSTNM"], row.get("CITY", ""), row.get("STABBR", ""),
                score, dim_profile, student_vector, best_dims, weak_dims,
            ),
            "strengths": best_dims,
            "tradeoffs": weak_dims[:3] if weak_dims else [],
            **dim_profile,
        })
    return matches


# ── Cache + main entry point ─────────────────────────────────────────────────

def _cache_key(student_vector: dict, profile: dict | None, top_n: int) -> str:
    return json.dumps({"v": sorted(student_vector.items()),
                       "p": sorted((profile or {}).items()), "n": top_n})


def _cosine_result(student_vector: dict, candidates: pd.DataFrame,
                   top_n: int, profile: dict | None = None) -> dict:
    """Package cosine-only results with used_fallback=True."""
    fallback = _weighted_cosine_match(student_vector, candidates, top_n, profile)
    names = [m["college_name"] for m in fallback]
    profiles = candidates[candidates["INSTNM"].isin(names)].copy()
    return {"matches": fallback, "raw_profiles": profiles, "used_fallback": True}


def get_matches(student_vector: dict, top_n: int = 4, profile: dict | None = None) -> dict:
    """
    Match a student against college alumni profiles.

    Pipeline:
      1. Composite score (80% cosine + 20% profile affinity) ranks all candidates
      2. Top 15 sent to Groq LLM for rich explanations
      3. Falls back to cosine + templates if Groq fails

    Returns dict with keys: matches, raw_profiles, used_fallback
    """
    key = _cache_key(student_vector, profile, top_n)
    if key in _cache:
        return _cache[key]

    merged = load_merged_data()
    candidates = merged[merged[EXPERIENCE_DIMS[0]].notna()].copy()

    if candidates.empty:
        return {"matches": [], "raw_profiles": pd.DataFrame(), "used_fallback": False}

    shortlisted = _shortlist(student_vector, candidates, n=15, profile=profile)

    print(f"[match] {len(candidates)} total → {len(shortlisted)} shortlisted for LLM")

    client = _get_groq()
    if client is None:
        print("[match] No GROQ_API_KEY — falling back to cosine")
        return _cosine_result(student_vector, candidates, top_n, profile)

    prompt = _build_prompt(student_vector, shortlisted, profile)

    UNRECOVERABLE = (
        groq_errors.RateLimitError,
        groq_errors.AuthenticationError,
        groq_errors.PermissionDeniedError,
    )
    MAX_RETRIES = 3

    last_err: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )

            raw_text = response.choices[0].message.content or ""
            result = _parse_llm_json(raw_text)
            matched_names = [m["college_name"] for m in result["matches"]]
            profiles = shortlisted[shortlisted["INSTNM"].isin(matched_names)].copy()

            enriched: list[dict] = []
            for match in result["matches"][:top_n]:
                row_df = profiles[profiles["INSTNM"] == match["college_name"]]
                if not row_df.empty:
                    row = row_df.iloc[0]
                    match["UNITID"] = int(row["UNITID"])
                    for dim in EXPERIENCE_DIMS:
                        match[dim] = float(row[dim])
                enriched.append(match)

            out = {"matches": enriched, "raw_profiles": profiles, "used_fallback": False}
            _cache[key] = out
            print(f"[match] Groq returned {len(enriched)} matches (attempt {attempt})")
            return out

        except UNRECOVERABLE as e:
            print(f"[match] Unrecoverable Groq error ({type(e).__name__}), falling back to cosine")
            return _cosine_result(student_vector, candidates, top_n, profile)

        except Exception as e:
            last_err = e
            wait = 2 ** attempt
            print(f"[match] Attempt {attempt}/{MAX_RETRIES} failed ({type(e).__name__}: {e}), "
                  f"retrying in {wait}s...")
            time.sleep(wait)

    print(f"[match] All {MAX_RETRIES} attempts failed ({last_err}), falling back to cosine")
    return _cosine_result(student_vector, candidates, top_n, profile)


if __name__ == "__main__":
    sample_prefs = {
        "academic_intensity": 7, "social_life": 8, "inclusivity": 9,
        "career_support": 6, "collaboration_vs_competition": 7,
        "mental_health_culture": 8, "campus_safety": 8, "overall_satisfaction": 8,
    }
    sample_profile = {
        "gpa": 3.7, "sat": 1350, "major": "Computer Science",
        "location": "Georgia", "in_state_preference": True,
        "extracurriculars": "Tennis, hackathons",
        "free_text": "I want a collaborative campus with strong tech culture",
    }

    print("Matching...\n")
    result = get_matches(sample_prefs, profile=sample_profile)
    print(f"used_fallback: {result['used_fallback']}\n")

    for i, m in enumerate(result["matches"]):
        print(f"#{i + 1}  {m.get('college_name', m.get('INSTNM'))}")
        print(f"    Score: {m['similarity_score']}")
        print(f"    Why: {m['explanation']}")
        print(f"    Strengths: {m.get('strengths')}")
        print(f"    Tradeoffs: {m.get('tradeoffs')}")
        print()
