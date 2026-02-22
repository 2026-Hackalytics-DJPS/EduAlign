import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { SvgRadar } from "./SvgRadar";
import { saveCollege, getReviewSummary } from "../api";
import type { MatchItem, Preferences } from "../types";

interface Props {
  match: MatchItem;
  studentPrefs: Preferences;
  rank: number;
}

const SHORT_LABELS: Record<string, string> = {
  "Academic Intensity": "Academic",
  "Social Life": "Social Life",
  "Inclusivity": "Inclusivity",
  "Career Support": "Career",
  "Collaboration vs Competition": "Collaboration",
  "Mental Health Culture": "Mental Health",
  "Campus Safety": "Safety",
  "Overall Satisfaction": "Satisfaction",
};

export function CollegeCard({ match, studentPrefs, rank }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);

  useEffect(() => {
    if (match.UNITID) {
      getReviewSummary(match.UNITID)
        .then((s) => { setReviewCount(s.review_count); setAvgRating(s.avg_rating); })
        .catch(() => {});
    }
  }, [match.UNITID]);

  const handleSave = async () => {
    if (!match.UNITID || saved) return;
    try {
      await saveCollege(match.UNITID, "target");
      setSaved(true);
    } catch { /* ignore */ }
  };

  const labels = EXPERIENCE_DIMS.map(
    (d) => SHORT_LABELS[DIMENSION_LABELS[d]] ?? DIMENSION_LABELS[d]
  );
  const studentVals = EXPERIENCE_DIMS.map((d) => studentPrefs[d]);
  const collegeVals = EXPERIENCE_DIMS.map(
    (d) => (Number((match as Record<string, unknown>)[d]) || 0) * 10
  );
  const hasProfile = collegeVals.some((v) => v > 0);
  const scorePct = ((match.similarity_score ?? 0) * 100).toFixed(0);

  return (
    <div className="mc">
      <div className="mc-bg">
        {/* Header */}
        <div className="mc-header">
          <div>
            <div className="mc-rank">Match #{rank}</div>
            <div className="mc-name">{match.INSTNM}</div>
            {reviewCount > 0 && (
              <div
                style={{ fontSize: "0.75rem", color: "#f59e0b", cursor: "pointer", marginTop: "0.1rem" }}
                onClick={(e) => { e.stopPropagation(); navigate(`/reviews/${match.UNITID}`); }}
              >
                {"★".repeat(Math.round(avgRating ?? 0))} {avgRating?.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleSave}
              title={saved ? "Saved!" : "Save to My Colleges"}
              style={{
                background: "none", border: "none", cursor: saved ? "default" : "pointer",
                fontSize: "1.3rem", lineHeight: 1, padding: 0,
                filter: saved ? "none" : "grayscale(1) opacity(0.5)",
                transition: "filter 0.2s",
              }}
            >
              {saved ? "❤️" : "🤍"}
            </button>
            <div className="mc-score">
              <span className="mc-score-num">{scorePct}</span>
              <span className="mc-score-pct">match</span>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className={`mc-explanation${expanded ? " expanded" : ""}`}>
          {match.explanation}
        </div>
        {match.explanation && match.explanation.length > 140 && (
          <button
            type="button"
            className="mc-read-more"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {/* Strength / Tradeoff pills */}
        <div className="mc-tags">
          {match.strengths?.slice(0, 3).map((s) => (
            <span key={s} className="mc-pill mc-pill-strength">
              {DIMENSION_LABELS[s as keyof typeof DIMENSION_LABELS] ?? s}
            </span>
          ))}
          {match.tradeoffs?.slice(0, 2).map((t) => (
            <span key={t} className="mc-pill mc-pill-tradeoff">
              {DIMENSION_LABELS[t as keyof typeof DIMENSION_LABELS] ?? t}
            </span>
          ))}
        </div>

        {/* Radar */}
        {hasProfile && (
          <div className="mc-radar-wrap">
            <SvgRadar
              series={[
                { values: studentVals, fill: "rgba(106,171,122,0.3)", stroke: "rgba(106,171,122,0.8)" },
                { values: collegeVals, fill: "rgba(168,184,216,0.25)", stroke: "rgba(168,184,216,0.8)" },
              ]}
              labels={labels}
              size={280}
            />
          </div>
        )}

        {/* Footer */}
        {match.UNITID && (
          <>
            <div className="mc-divider" />
            <div className="mc-footer">
              <a
                className="mc-explore"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/financial?unitid=${match.UNITID}`);
                }}
              >
                Financial Plan
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                className="mc-explore"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/compare");
                }}
              >
                Compare
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                className="mc-explore"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/reviews/${match.UNITID}`);
                }}
              >
                Reviews
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
