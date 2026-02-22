"""
Generate synthetic alumni experience ratings for 20 well-known colleges.
Each college has a hand-tuned base profile; individual entries get +/-1 jitter.

Run from project root: python -m backend.scripts.seed_alumni
"""

import os
import random

import pandas as pd

random.seed(42)

COLLEGES = [
    (139755, "Georgia Institute of Technology"),
    (166027, "Massachusetts Institute of Technology"),
    (130794, "Yale University"),
    (215062, "University of Pennsylvania"),
    (243744, "Princeton University"),
    (144050, "University of Chicago"),
    (110635, "University of California Berkeley"),
    (126614, "University of Colorado Boulder"),
    (228778, "University of Texas Austin"),
    (201885, "Ohio State University"),
    (163286, "University of Maryland"),
    (199120, "Duke University"),
    (198419, "University of North Carolina Chapel Hill"),
    (218663, "University of South Carolina"),
    (212577, "Pennsylvania State University"),
    (171100, "University of Michigan"),
    (147767, "Northwestern University"),
    (190150, "New York University"),
    (173258, "University of Minnesota"),
    (204796, "Purdue University"),
]

# Base profiles: [academic_intensity, social_life, inclusivity, career_support,
#                  collaboration_vs_competition, mental_health_culture, campus_safety,
#                  overall_satisfaction]
PROFILES = {
    "Georgia Institute of Technology":          [8, 5, 6, 9, 3, 5, 7, 7],
    "Massachusetts Institute of Technology":    [9, 5, 7, 9, 3, 6, 8, 8],
    "Yale University":                          [7, 8, 8, 8, 6, 7, 8, 9],
    "University of Pennsylvania":               [8, 7, 7, 9, 4, 6, 7, 8],
    "Princeton University":                     [8, 7, 8, 8, 4, 6, 8, 9],
    "University of Chicago":                    [9, 4, 7, 8, 4, 5, 7, 8],
    "University of California Berkeley":        [7, 7, 8, 8, 6, 6, 6, 8],
    "University of Colorado Boulder":           [5, 9, 7, 6, 7, 8, 8, 7],
    "University of Texas Austin":               [6, 8, 7, 7, 6, 7, 7, 8],
    "Ohio State University":                    [6, 8, 6, 7, 6, 7, 7, 7],
    "University of Maryland":                   [6, 7, 7, 7, 6, 6, 7, 7],
    "Duke University":                          [8, 7, 8, 9, 5, 7, 8, 9],
    "University of North Carolina Chapel Hill": [6, 8, 8, 7, 7, 7, 8, 8],
    "University of South Carolina":             [5, 8, 6, 6, 7, 7, 7, 7],
    "Pennsylvania State University":            [6, 8, 6, 7, 6, 7, 7, 7],
    "University of Michigan":                   [7, 8, 7, 8, 5, 7, 7, 8],
    "Northwestern University":                  [8, 6, 7, 9, 4, 6, 7, 8],
    "New York University":                      [6, 8, 8, 8, 6, 6, 7, 8],
    "University of Minnesota":                  [6, 7, 7, 7, 6, 7, 7, 7],
    "Purdue University":                        [7, 6, 6, 8, 5, 6, 7, 7],
}

DIMENSIONS = [
    "academic_intensity",
    "social_life",
    "inclusivity",
    "career_support",
    "collaboration_vs_competition",
    "mental_health_culture",
    "campus_safety",
    "overall_satisfaction",
]


def jitter(x):
    return min(10, max(1, x + random.randint(-1, 1)))


def generate_alumni_ratings(n=100):
    rows = []
    for _ in range(n):
        cid, cname = random.choice(COLLEGES)
        base = PROFILES[cname]
        entry = {"college_id": cid, "college_name": cname}
        for dim, val in zip(DIMENSIONS, base):
            entry[dim] = jitter(val)
        entry["review_text"] = ""
        rows.append(entry)
    return pd.DataFrame(rows)


if __name__ == "__main__":
    # backend/scripts -> project root -> data/raw
    out_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "alumni_ratings.csv")
    df = generate_alumni_ratings(100)
    df.to_csv(out_path, index=False)
    print(f"Shape: {df.shape}")
    print(f"Wrote: {out_path}")
    print(f"\nColleges covered: {df['college_name'].nunique()}")
    print(f"Entries per college:\n{df['college_name'].value_counts().to_string()}")
    print(f"\nSample rows:")
    print(df.head(10).to_string(index=False))
