import { useState } from "react";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import type { Preferences } from "../types";
import type { MatchItem } from "../types";
import { postMatch } from "../api";
import { RadarChart } from "../components/RadarChart";

const initialPrefs: Preferences = {
  academic_intensity: 5,
  social_life: 5,
  inclusivity: 5,
  career_support: 5,
  collaboration_vs_competition: 5,
  mental_health_culture: 5,
  campus_safety: 5,
  overall_satisfaction: 5,
};

export function FindYourMatch() {
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMatch = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await postMatch({
        preferences: { ...prefs },
        top_n: 4,
      });
      setMatches(res.matches ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const studentNormalized = EXPERIENCE_DIMS.map((d) => (prefs[d] - 1) / 9);
  const labels = EXPERIENCE_DIMS.map((d) => DIMENSION_LABELS[d]);

  return (
    <div className="page find-your-match">
      <h1>Find Your Match</h1>
      <p className="subtitle">
        Rate how important each experience dimension is to you (1 = not important, 10 = essential).
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

      {matches.length > 0 && (
        <div className="matches-section">
          <p className="success-msg">Found your top {matches.length} matches!</p>
          {matches.map((match, i) => {
            const collegeVals = EXPERIENCE_DIMS.map(
              (d) => Number((match as Record<string, unknown>)[d]) ?? 0
            );
            const hasProfile = collegeVals.some((v) => v > 0 || v < 0);
            return (
              <div key={`${match.INSTNM}-${i}`} className="match-card">
                <h3>#{i + 1} — {match.INSTNM}</h3>
                <div className="match-content">
                  <div className="match-meta">
                    <div className="metric">
                      Alignment Score{" "}
                      {(match.similarity_score * 100).toFixed(0)}%
                    </div>
                    {match.strengths && match.strengths.length > 0 && (
                      <p>
                        <strong>Strengths:</strong>{" "}
                        {match.strengths
                          .map((s) => DIMENSION_LABELS[s as keyof typeof DIMENSION_LABELS] ?? s)
                          .join(", ")}
                      </p>
                    )}
                    {match.tradeoffs && match.tradeoffs.length > 0 && (
                      <p>
                        <strong>Watch out:</strong>{" "}
                        {match.tradeoffs
                          .map((t) => DIMENSION_LABELS[t as keyof typeof DIMENSION_LABELS] ?? t)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="match-detail">
                    <p className="explanation">{match.explanation}</p>
                    {hasProfile && (
                      <RadarChart
                        series={[
                          { name: "Your Preferences", values: studentNormalized },
                          {
                            name: match.INSTNM,
                            values: collegeVals,
                            opacity: 0.6,
                          },
                        ]}
                        labels={labels}
                        height={400}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
