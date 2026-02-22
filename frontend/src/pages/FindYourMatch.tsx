import React, { useState, useCallback } from "react";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import type { Preferences, MatchItem, StudentProfile } from "../types";
import { postMatch, postSuggestSliders } from "../api";
import { ProfileForm } from "../components/ProfileForm";
import { CollegeCard } from "../components/CollegeCard";

const initialPrefs: Preferences = Object.fromEntries(
  EXPERIENCE_DIMS.map((d) => [d, 5])
) as Preferences;

const emptyProfile: StudentProfile = {
  gpa: null,
  sat: null,
  major: null,
  location: null,
  extracurriculars: null,
  in_state_preference: false,
  free_text: null,
};

export function FindYourMatch() {
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileChange = useCallback(async (next: StudentProfile) => {
    setProfile(next);
    const hasData = next.gpa || next.major || next.extracurriculars || next.free_text;
    if (hasData) {
      try {
        const res = await postSuggestSliders(
          Object.fromEntries(
            Object.entries(next).filter(([, v]) => v != null && v !== "" && v !== false)
          )
        );
        if (res.suggested_sliders) {
          setPrefs((prev) => ({ ...prev, ...res.suggested_sliders }) as Preferences);
        }
      } catch {
        /* keep current sliders */
      }
    }
  }, []);

  const handleMatch = async () => {
    setError(null);
    setLoading(true);
    setMatches([]);
    try {
      const profilePayload = Object.fromEntries(
        Object.entries(profile).filter(([, v]) => v != null && v !== "" && v !== false)
      );
      const res = await postMatch({
        preferences: { ...prefs },
        top_n: 4,
        profile: Object.keys(profilePayload).length > 0 ? profilePayload : undefined,
      });
      setMatches(res.matches ?? []);
      setUsedFallback(res.used_fallback ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page find-your-match">
      <h1>Find Your Match</h1>
      <p className="subtitle">
        Tell us about yourself and rate what matters most — we'll find colleges
        that align with your experience, not just your stats.
      </p>

      <h2 style={{ fontSize: "1.1rem", margin: "1.5rem 0 0.75rem" }}>
        Your Profile
      </h2>
      <ProfileForm profile={profile} onChange={handleProfileChange} />

      <h2 style={{ fontSize: "1.1rem", margin: "1.5rem 0 0.75rem" }}>
        Experience Preferences
      </h2>
      <p className="hint">
        Rate how important each dimension is (1 = not important, 10 = essential).
        Filling out your profile above will auto-suggest values.
      </p>

      <div className="sliders-grid">
        {EXPERIENCE_DIMS.map((dim) => (
          <div key={dim} className="slider-row">
            <label htmlFor={dim}>{DIMENSION_LABELS[dim]}</label>
            <input
              id={dim}
              type="range"
              min={1}
              max={10}
              value={prefs[dim]}
              onChange={(e) =>
                setPrefs((p) => ({ ...p, [dim]: Number(e.target.value) }))
              }
            />
            <span className="slider-value">{prefs[dim]}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="primary-btn"
        onClick={handleMatch}
        disabled={loading}
      >
        {loading ? "Finding your matches…" : "Match Me"}
      </button>

      {error && <div className="error-banner">{error}</div>}

      {usedFallback && matches.length > 0 && (
        <p className="warning-msg" style={{ marginTop: "1rem" }}>
          Showing similarity-based matches (AI explanations temporarily unavailable).
        </p>
      )}

      {matches.length > 0 && (
        <div className="matches-section">
          <p className="success-msg">Found your top {matches.length} matches!</p>
          {matches.map((match, i) => (
            <CollegeCard
              key={match.UNITID ?? i}
              match={match}
              studentPrefs={prefs}
              rank={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
