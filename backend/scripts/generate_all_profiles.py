"""
One-time script: generate experience profiles for ALL colleges in the
trimmed Scorecard using statistical proxies derived from available columns.

Hand-tuned alumni profiles (20 colleges) are preserved as-is.
Auto-generated profiles are flagged with profile_source='estimated'.

Run from project root:
    python3 -m backend.scripts.generate_all_profiles

Writes: data/cleaned/colleges_merged.csv (overwrites existing)
"""

import os
import sys

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.colleges.preprocessing import (
    ALUMNI_RAW,
    CLEANED_DIR,
    COLLEGES_MERGED,
    COLLEGES_TRIMMED,
    EXPERIENCE_DIMS,
    aggregate_alumni,
    trim_scorecard,
)


def _safe_numeric(df: pd.DataFrame, col: str) -> pd.Series:
    return pd.to_numeric(df[col], errors="coerce")


def _normalize_series(s: pd.Series) -> pd.Series:
    """Min-max normalize a series to 0-1, handling NaN."""
    smin, smax = s.min(), s.max()
    if smax == smin:
        return pd.Series(0.5, index=s.index)
    return (s - smin) / (smax - smin)


def _diversity_index(df: pd.DataFrame) -> pd.Series:
    """
    Simpson's diversity index from race/ethnicity columns.
    Higher = more diverse = range 0 to ~0.75.
    """
    cols = ["UGDS_WHITE", "UGDS_BLACK", "UGDS_HISP", "UGDS_ASIAN"]
    fracs = df[cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    # 1 - sum(p^2)  -- max when all groups equal
    return 1 - (fracs ** 2).sum(axis=1)


def generate_proxy_profiles(df: pd.DataFrame) -> pd.DataFrame:
    """
    Derive the 8 experience dimensions from Scorecard columns.
    Returns a DataFrame with UNITID + 8 dimensions (raw, unnormalized).
    """
    n = len(df)
    rng = np.random.RandomState(42)

    adm_rate = _safe_numeric(df, "ADM_RATE")
    sat_avg = _safe_numeric(df, "SAT_AVG")
    stufacr = _safe_numeric(df, "STUFACR")
    ugds = _safe_numeric(df, "UGDS")
    c150 = _safe_numeric(df, "C150_4")
    ret_ft4 = _safe_numeric(df, "RET_FT4")
    earnings = _safe_numeric(df, "MD_EARN_WNE_P10")
    pctpell = _safe_numeric(df, "PCTPELL")
    control = _safe_numeric(df, "CONTROL")
    hbcu = _safe_numeric(df, "HBCU")
    roomboard = _safe_numeric(df, "ROOMBOARD_ON")

    # ── 1. academic_intensity ──
    # Higher SAT, lower admission rate, lower student-faculty ratio = more intense
    sat_norm = _normalize_series(sat_avg.fillna(sat_avg.median()))
    adm_inv = _normalize_series(1 - adm_rate.fillna(adm_rate.median()))
    sfr_inv = _normalize_series(1 / stufacr.clip(lower=1).fillna(stufacr.median()))
    academic_intensity = sat_norm * 0.45 + adm_inv * 0.40 + sfr_inv * 0.15

    # ── 2. social_life ──
    # Larger schools, public institutions, having on-campus housing
    size_norm = _normalize_series(np.log1p(ugds.fillna(ugds.median())))
    is_public = (control == 1).astype(float) * 0.7 + 0.3
    has_housing = roomboard.notna().astype(float) * 0.3 + 0.7
    social_life = size_norm * 0.50 + is_public * 0.25 + has_housing * 0.25

    # ── 3. inclusivity ──
    # Racial diversity (Simpson's index), Pell grant %, HBCU flag
    diversity = _normalize_series(_diversity_index(df))
    pell_norm = _normalize_series(pctpell.fillna(pctpell.median()))
    hbcu_boost = hbcu.fillna(0) * 0.15
    inclusivity = diversity * 0.50 + pell_norm * 0.30 + hbcu_boost + 0.05

    # ── 4. career_support ──
    # Higher earnings, higher completion rate
    earn_norm = _normalize_series(earnings.fillna(earnings.median()))
    comp_norm = _normalize_series(c150.fillna(c150.median()))
    career_support = earn_norm * 0.60 + comp_norm * 0.40

    # ── 5. collaboration_vs_competition ──
    # Less selective + public schools lean collaborative; highly selective lean competitive
    # Scale: 0 = very competitive, 1 = very collaborative
    adm_norm = _normalize_series(adm_rate.fillna(adm_rate.median()))
    public_factor = (control == 1).astype(float) * 0.2
    collab = adm_norm * 0.65 + public_factor + 0.15
    collaboration_vs_competition = collab.clip(0, 1)

    # ── 6. mental_health_culture ──
    # Lower student-faculty ratio + higher retention as weak proxy, add noise
    sfr_mental = _normalize_series(1 / stufacr.clip(lower=1).fillna(stufacr.median()))
    ret_norm = _normalize_series(ret_ft4.fillna(ret_ft4.median()))
    noise = rng.normal(0, 0.08, n)
    mental_health_culture = (sfr_mental * 0.45 + ret_norm * 0.45 + 0.10 + noise).clip(0, 1)

    # ── 7. campus_safety ──
    # No direct data. Use retention + smaller school size + noise as rough proxy
    size_inv = _normalize_series(1 / np.log1p(ugds.fillna(ugds.median()).clip(lower=1)))
    noise2 = rng.normal(0, 0.08, n)
    campus_safety = (ret_norm * 0.40 + size_inv * 0.30 + 0.30 + noise2).clip(0, 1)

    # ── 8. overall_satisfaction ──
    # Retention + completion + earnings as holistic satisfaction proxy
    overall_satisfaction = (ret_norm * 0.40 + comp_norm * 0.35 + earn_norm * 0.25)

    result = pd.DataFrame({
        "UNITID": df["UNITID"].values,
        "academic_intensity": academic_intensity.values,
        "social_life": social_life.values,
        "inclusivity": inclusivity.values,
        "career_support": career_support.values,
        "collaboration_vs_competition": collaboration_vs_competition.values,
        "mental_health_culture": mental_health_culture.values,
        "campus_safety": campus_safety.values,
        "overall_satisfaction": overall_satisfaction.values,
    })

    # Final min-max normalize all dimensions to 0-1
    scaler = MinMaxScaler()
    result[EXPERIENCE_DIMS] = scaler.fit_transform(result[EXPERIENCE_DIMS])

    return result


def main():
    # Load trimmed scorecard
    if not os.path.exists(COLLEGES_TRIMMED):
        trim_scorecard()
    colleges = pd.read_csv(COLLEGES_TRIMMED)
    print(f"Loaded {len(colleges)} colleges from trimmed Scorecard")

    # Load hand-tuned alumni profiles (20 colleges)
    alumni_profiles = aggregate_alumni()
    alumni_unitids = set(alumni_profiles["college_id"].tolist())
    print(f"Loaded {len(alumni_unitids)} hand-tuned alumni profiles")

    # Generate proxy profiles for ALL colleges
    proxy_profiles = generate_proxy_profiles(colleges)
    print(f"Generated proxy profiles for {len(proxy_profiles)} colleges")

    # Split: keep hand-tuned where they exist, use proxy for the rest
    proxy_only = proxy_profiles[~proxy_profiles["UNITID"].isin(alumni_unitids)].copy()
    proxy_only["profile_source"] = "estimated"

    alumni_merge = alumni_profiles.rename(columns={"college_id": "UNITID"})
    alumni_merge["profile_source"] = "alumni"

    all_profiles = pd.concat([alumni_merge, proxy_only], ignore_index=True)
    print(f"  Hand-tuned (alumni): {len(alumni_merge)}")
    print(f"  Estimated (proxy):   {len(proxy_only)}")
    print(f"  Total profiles:      {len(all_profiles)}")

    # Merge with college data
    merged = colleges.merge(all_profiles, on="UNITID", how="left")

    os.makedirs(CLEANED_DIR, exist_ok=True)
    merged.to_csv(COLLEGES_MERGED, index=False)
    print(f"\nWrote {COLLEGES_MERGED}")
    print(f"  Shape: {merged.shape[0]} rows x {merged.shape[1]} columns")
    print(f"  Colleges with profiles: {merged[EXPERIENCE_DIMS[0]].notna().sum()}")
    print(f"  Alumni-sourced: {(merged['profile_source'] == 'alumni').sum()}")
    print(f"  Estimated: {(merged['profile_source'] == 'estimated').sum()}")


if __name__ == "__main__":
    main()
