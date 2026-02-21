"""
LLM-powered matching engine for EduAlign.

Sends student preferences and college alumni profiles to Google Gemini,
which reasons about the best matches and returns structured results
with natural language explanations.
"""

import json
import os

import google.generativeai as genai
import pandas as pd
from dotenv import load_dotenv

from backend.preprocessing import EXPERIENCE_DIMS, load_merged_data

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = genai.GenerativeModel("gemini-2.0-flash")

SYSTEM_PROMPT = """You are EduAlign's college matching engine. You receive:
1. A student's experience preferences (rated 1-10 across 8 dimensions)
2. Profiles of colleges with alumni-reported experience ratings (normalized 0-1)

Your job:
- Reason about which colleges best align with the student's priorities.
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
      "weaknesses": ["dimension3"]
    }
  ]
}

Order matches from best fit (#1) to #4. similarity_score should reflect overall alignment
where 1.0 is a perfect match. Be honest about trade-offs in the explanation."""


def _build_prompt(student_vector: dict, candidates: pd.DataFrame) -> str:
    """Build the prompt with student prefs and college profiles."""
    student_lines = "\n".join(
        f"  {dim}: {val}/10" for dim, val in student_vector.items()
    )

    college_blocks = []
    for _, row in candidates.iterrows():
        dims = ", ".join(f"{d}: {row[d]:.2f}" for d in EXPERIENCE_DIMS)
        college_blocks.append(f"- {row['INSTNM']} ({row['CITY']}, {row['STABBR']}): {dims}")
    colleges_text = "\n".join(college_blocks)

    return f"""Student preferences (1-10 scale):
{student_lines}

Available colleges with alumni experience profiles (0-1 normalized scale):
{colleges_text}

Return the top 4 best matches as JSON."""


def get_matches(student_vector: dict, top_n: int = 4) -> dict:
    """
    Match a student's preferences against college alumni profiles using Gemini.

    Parameters
    ----------
    student_vector : dict
        Keys are the 8 experience dimension names, values are 1-10 ints.
    top_n : int
        Number of top matches to return (sent to the LLM).

    Returns
    -------
    dict with keys:
        "matches": list of dicts with college_name, similarity_score,
                   explanation, strengths, weaknesses
        "raw_profiles": DataFrame of the candidate colleges (for charts)
    """
    merged = load_merged_data()
    candidates = merged[merged[EXPERIENCE_DIMS[0]].notna()].copy()

    if candidates.empty:
        return {"matches": [], "raw_profiles": pd.DataFrame()}

    prompt = _build_prompt(student_vector, candidates)

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

    return {
        "matches": result["matches"][:top_n],
        "raw_profiles": profiles,
    }


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

    print("Sending to Gemini...\n")
    result = get_matches(sample_prefs)

    for i, match in enumerate(result["matches"]):
        print(f"#{i + 1}  {match['college_name']}")
        print(f"    Score: {match['similarity_score']}")
        print(f"    Why: {match['explanation']}")
        print(f"    Strengths: {match['strengths']}")
        print(f"    Weaknesses: {match['weaknesses']}")
        print()
