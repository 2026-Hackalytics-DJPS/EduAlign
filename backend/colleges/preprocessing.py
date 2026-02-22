"""
Preprocessing pipeline for EduAlign.

1. Trims raw College Scorecard CSV to 30 key columns and cleans nulls.
2. Aggregates alumni experience ratings by college.
3. Min-max normalizes the 8 experience dimensions.
4. Merges Scorecard data with normalized alumni profiles.
5. Saves to data/cleaned/colleges_merged.csv.
"""

import os

import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# Project root (backend/colleges -> backend -> project root)
BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
CLEANED_DIR = os.path.join(BASE_DIR, "data", "cleaned")

SCORECARD_RAW = os.path.join(RAW_DIR, "collegeScorecard.csv")
ALUMNI_RAW = os.path.join(RAW_DIR, "alumni_ratings.csv")
COLLEGES_TRIMMED = os.path.join(CLEANED_DIR, "colleges_trimmed.csv")
COLLEGES_MERGED = os.path.join(CLEANED_DIR, "colleges_merged.csv")

SCORECARD_COLS = [
    "UNITID", "INSTNM", "CITY", "STABBR",
    "CONTROL",
    "ADM_RATE",
    "TUITIONFEE_IN", "TUITIONFEE_OUT",
    "COSTT4_A",
    "ROOMBOARD_ON", "ROOMBOARD_OFF",
    "BOOKSUPPLY", "OTHEREXPENSE_ON",
    "PCTPELL",
    "DEBT_MDN",
    "MD_EARN_WNE_P10",
    "C150_4",
    "RET_FT4",
    "UGDS",
    "UGDS_WHITE", "UGDS_BLACK", "UGDS_HISP", "UGDS_ASIAN",
    "STUFACR",
    "SAT_AVG",
    "LATITUDE", "LONGITUDE",
    "HBCU", "WOMENONLY", "MENONLY",
]

EXPERIENCE_DIMS = [
    "academic_intensity",
    "social_life",
    "inclusivity",
    "career_support",
    "collaboration_vs_competition",
    "mental_health_culture",
    "campus_safety",
    "overall_satisfaction",
]


def trim_scorecard():
    """Trim raw Scorecard to 30 columns and clean nulls (friend's approach)."""
    print(f"Reading {SCORECARD_RAW} ...")
    df = pd.read_csv(SCORECARD_RAW, usecols=SCORECARD_COLS, low_memory=False)
    print(f"  Raw shape: {df.shape[0]} rows x {df.shape[1]} columns")

    df = df.dropna(subset=["TUITIONFEE_IN", "TUITIONFEE_OUT"])
    df[["HBCU", "MENONLY", "WOMENONLY"]] = df[["HBCU", "MENONLY", "WOMENONLY"]].fillna(0)

    os.makedirs(CLEANED_DIR, exist_ok=True)
    df.to_csv(COLLEGES_TRIMMED, index=False)
    print(f"  Trimmed shape: {df.shape[0]} rows x {df.shape[1]} columns")
    print(f"  Wrote {COLLEGES_TRIMMED}")
    return df


def aggregate_alumni():
    """Group alumni ratings by college_id, average the 8 experience dimensions."""
    print(f"Reading {ALUMNI_RAW} ...")
    alumni = pd.read_csv(ALUMNI_RAW)
    profiles = alumni.groupby("college_id")[EXPERIENCE_DIMS].mean()

    scaler = MinMaxScaler()
    profiles[EXPERIENCE_DIMS] = scaler.fit_transform(profiles[EXPERIENCE_DIMS])

    profiles = profiles.reset_index()
    print(f"  Alumni profiles: {len(profiles)} colleges, {len(EXPERIENCE_DIMS)} normalized dimensions")
    return profiles


def load_merged_data():
    """Load (or build) the merged Scorecard + alumni profiles dataframe."""
    if os.path.exists(COLLEGES_MERGED):
        return pd.read_csv(COLLEGES_MERGED)

    if not os.path.exists(COLLEGES_TRIMMED):
        trim_scorecard()

    colleges = pd.read_csv(COLLEGES_TRIMMED)
    profiles = aggregate_alumni()

    merged = colleges.merge(profiles, left_on="UNITID", right_on="college_id", how="left")
    merged.drop(columns=["college_id"], inplace=True)

    merged.to_csv(COLLEGES_MERGED, index=False)
    print(f"  Merged shape: {merged.shape[0]} rows x {merged.shape[1]} columns")
    print(f"  Colleges with alumni data: {merged[EXPERIENCE_DIMS[0]].notna().sum()}")
    print(f"  Wrote {COLLEGES_MERGED}")
    return merged


if __name__ == "__main__":
    trim_scorecard()
    load_merged_data()
