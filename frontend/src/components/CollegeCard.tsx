import React from "react";
import { useNavigate } from "react-router-dom";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { RadarChart } from "./RadarChart";
import type { MatchItem, Preferences } from "../types";

interface Props {
  match: MatchItem;
  studentPrefs: Preferences;
  rank: number;
}

export function CollegeCard({ match, studentPrefs, rank }: Props) {
  const navigate = useNavigate();

  const labels = EXPERIENCE_DIMS.map((d) => DIMENSION_LABELS[d]);
  const studentNorm = EXPERIENCE_DIMS.map((d) => (studentPrefs[d] - 1) / 9);
  const collegeVals = EXPERIENCE_DIMS.map(
    (d) => Number((match as Record<string, unknown>)[d]) || 0
  );
  const hasProfile = collegeVals.some((v) => v > 0);
  const scorePct = ((match.similarity_score ?? 0) * 100).toFixed(0);

  return (
    <div className="match-card">
      <h3>
        #{rank} — {match.INSTNM}
        <span
          style={{
            float: "right",
            background: "#2563eb",
            color: "#fff",
            padding: "0.2rem 0.6rem",
            borderRadius: 12,
            fontSize: "0.85rem",
          }}
        >
          {scorePct}% Match
        </span>
      </h3>
      <div className="match-content">
        <div className="match-meta">
          {match.strengths && match.strengths.length > 0 && (
            <p>
              <strong>Strengths:</strong>{" "}
              {match.strengths
                .map(
                  (s) =>
                    DIMENSION_LABELS[s as keyof typeof DIMENSION_LABELS] ?? s
                )
                .join(", ")}
            </p>
          )}
          {match.tradeoffs && match.tradeoffs.length > 0 && (
            <p>
              <strong>Watch out:</strong>{" "}
              {match.tradeoffs
                .map(
                  (t) =>
                    DIMENSION_LABELS[t as keyof typeof DIMENSION_LABELS] ?? t
                )
                .join(", ")}
            </p>
          )}
        </div>
        <div className="match-detail">
          <p className="explanation">{match.explanation}</p>
          {hasProfile && (
            <RadarChart
              series={[
                { name: "Your Preferences", values: studentNorm },
                { name: match.INSTNM, values: collegeVals, opacity: 0.6 },
              ]}
              labels={labels}
              height={350}
            />
          )}
        </div>
      </div>
      {match.UNITID && (
        <button
          type="button"
          className="primary-btn"
          style={{ marginTop: "1rem", width: "100%" }}
          onClick={() => navigate(`/financial?unitid=${match.UNITID}`)}
        >
          Plan Finances →
        </button>
      )}
    </div>
  );
}
