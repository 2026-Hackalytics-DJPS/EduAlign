"""
Generate synthetic alumni experience ratings for ALL 3,729 colleges.

- The original 20 hand-tuned colleges keep their exact base profiles.
- The remaining 3,709 get base profiles derived from Scorecard proxy scores.
- Each college gets 5 alumni entries with +/-1 jitter (same method as seed_alumni.py).

Run from project root:
    python3 -m backend.scripts.seed_all_alumni

Writes: data/raw/alumni_ratings.csv (overwrites existing)
Then regenerate merged data:
    python3 -m backend.colleges.preprocessing
"""

import os
import random
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.scripts.seed_alumni import COLLEGES as HANDTUNED_COLLEGES
from backend.scripts.seed_alumni import DIMENSIONS, PROFILES as HANDTUNED_PROFILES

random.seed(42)
np.random.seed(42)

ENTRIES_PER_COLLEGE = 5

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "alumni_ratings.csv")
TRIMMED_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned", "colleges_trimmed.csv")


def jitter(x):
    return min(10, max(1, x + random.randint(-1, 1)))


def _safe_numeric(df, col):
    return pd.to_numeric(df[col], errors="coerce")


def _norm(s):
    smin, smax = s.min(), s.max()
    if smax == smin:
        return pd.Series(0.5, index=s.index)
    return (s - smin) / (smax - smin)


def _diversity_index(df):
    cols = ["UGDS_WHITE", "UGDS_BLACK", "UGDS_HISP", "UGDS_ASIAN"]
    fracs = df[cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    return 1 - (fracs ** 2).sum(axis=1)


def derive_base_profiles(df: pd.DataFrame) -> dict[int, list[int]]:
    """
    Derive 1-10 base profile for each college from Scorecard columns.
    Returns {UNITID: [8 ints]}.
    """
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

    # academic_intensity
    sat_n = _norm(sat_avg.fillna(sat_avg.median()))
    adm_inv = _norm(1 - adm_rate.fillna(adm_rate.median()))
    sfr_inv = _norm(1 / stufacr.clip(lower=1).fillna(stufacr.median()))
    academic = sat_n * 0.45 + adm_inv * 0.40 + sfr_inv * 0.15

    # social_life
    size_n = _norm(np.log1p(ugds.fillna(ugds.median())))
    is_pub = (control == 1).astype(float) * 0.7 + 0.3
    has_house = roomboard.notna().astype(float) * 0.3 + 0.7
    social = size_n * 0.50 + is_pub * 0.25 + has_house * 0.25

    # inclusivity
    div = _norm(_diversity_index(df))
    pell_n = _norm(pctpell.fillna(pctpell.median()))
    hbcu_b = hbcu.fillna(0) * 0.15
    inclusive = div * 0.50 + pell_n * 0.30 + hbcu_b + 0.05

    # career_support
    earn_n = _norm(earnings.fillna(earnings.median()))
    comp_n = _norm(c150.fillna(c150.median()))
    career = earn_n * 0.60 + comp_n * 0.40

    # collaboration_vs_competition (higher = more collaborative)
    adm_n = _norm(adm_rate.fillna(adm_rate.median()))
    pub_f = (control == 1).astype(float) * 0.2
    collab = (adm_n * 0.65 + pub_f + 0.15).clip(0, 1)

    # mental_health_culture
    ret_n = _norm(ret_ft4.fillna(ret_ft4.median()))
    mental = (sfr_inv * 0.45 + ret_n * 0.45 + 0.10).clip(0, 1)

    # campus_safety
    size_inv = _norm(1 / np.log1p(ugds.fillna(ugds.median()).clip(lower=1)))
    safety = (ret_n * 0.40 + size_inv * 0.30 + 0.30).clip(0, 1)

    # overall_satisfaction
    satisfaction = ret_n * 0.40 + comp_n * 0.35 + earn_n * 0.25

    raw_dims = pd.DataFrame({
        "academic_intensity": academic,
        "social_life": social,
        "inclusivity": inclusive,
        "career_support": career,
        "collaboration_vs_competition": collab,
        "mental_health_culture": mental,
        "campus_safety": safety,
        "overall_satisfaction": satisfaction,
    })

    # Scale each dimension across all colleges to use full 1-10 range
    profiles = {}
    for i, row in df.iterrows():
        uid = int(row["UNITID"])
        vals = []
        for dim in DIMENSIONS:
            v = raw_dims.loc[i, dim]
            scaled = max(1, min(10, round(v * 9 + 1)))
            vals.append(scaled)
        profiles[uid] = vals

    return profiles


def main():
    print("Loading trimmed Scorecard...")
    colleges = pd.read_csv(TRIMMED_PATH)
    print(f"  {len(colleges)} colleges")

    # Build UNITID -> name mapping
    uid_to_name = dict(zip(colleges["UNITID"].astype(int), colleges["INSTNM"]))

    # Hand-tuned UNITIDs
    handtuned_uids = {uid for uid, _ in HANDTUNED_COLLEGES}
    handtuned_uid_to_name = {uid: name for uid, name in HANDTUNED_COLLEGES}

    # Derive proxy base profiles for non-handtuned colleges
    print("Deriving base profiles from Scorecard data...")
    proxy_profiles = derive_base_profiles(colleges)

    # Build final base profiles: hand-tuned override proxy
    base_profiles = {}
    for uid in colleges["UNITID"].astype(int):
        if uid in handtuned_uids:
            name = handtuned_uid_to_name[uid]
            base_profiles[uid] = HANDTUNED_PROFILES[name]
        else:
            base_profiles[uid] = proxy_profiles[uid]

    # Generate alumni entries
    print(f"Generating {ENTRIES_PER_COLLEGE} alumni entries per college...")
    rows = []
    for uid, base in base_profiles.items():
        name = uid_to_name.get(uid, f"Unknown ({uid})")
        for _ in range(ENTRIES_PER_COLLEGE):
            entry = {"college_id": uid, "college_name": name}
            for dim, val in zip(DIMENSIONS, base):
                entry[dim] = jitter(val)
            entry["review_text"] = ""
            rows.append(entry)

    df = pd.DataFrame(rows)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    print(f"\nWrote: {OUT_PATH}")
    print(f"  Total entries: {len(df)}")
    print(f"  Colleges covered: {df['college_id'].nunique()}")
    print(f"  Hand-tuned colleges: {sum(1 for uid in base_profiles if uid in handtuned_uids)}")
    print(f"  Proxy-derived colleges: {sum(1 for uid in base_profiles if uid not in handtuned_uids)}")

    # Verify hand-tuned colleges preserved
    print("\nSpot check (hand-tuned) — Georgia Tech base profile:")
    gt_entries = df[df["college_id"] == 139755][DIMENSIONS]
    print(f"  Entries: {len(gt_entries)}")
    print(f"  Mean: {gt_entries.mean().tolist()}")
    print(f"  Original base: {HANDTUNED_PROFILES['Georgia Institute of Technology']}")

    print("\nSpot check (proxy-derived) — first non-handtuned college:")
    non_ht = [uid for uid in base_profiles if uid not in handtuned_uids]
    if non_ht:
        sample_uid = non_ht[0]
        sample_name = uid_to_name.get(sample_uid, "?")
        sample_entries = df[df["college_id"] == sample_uid][DIMENSIONS]
        print(f"  {sample_name} (UNITID: {sample_uid})")
        print(f"  Base profile: {base_profiles[sample_uid]}")
        print(f"  Mean of entries: {sample_entries.mean().round(1).tolist()}")


if __name__ == "__main__":
    main()
