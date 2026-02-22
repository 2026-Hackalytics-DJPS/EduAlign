import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCollegeReviews,
  getCollegeDetail,
  getRecentReviews,
  voteReview,
  getColleges,
} from "../api";
import type { CollegeReviewsResponse, ReviewRow } from "../api";
import type { CollegeDetail, CollegeListItem } from "../types";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { SvgRadar } from "../components/SvgRadar";
import "./CollegeReviewPage.css";

function Stars({ rating }: { rating: number }) {
  return <span className="rv-review-stars">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const SHORT_LABELS: Record<string, string> = {
  academic_intensity: "Academics",
  social_life: "Social",
  inclusivity: "Inclusive",
  career_support: "Career",
  collaboration_vs_competition: "Collab",
  mental_health_culture: "Wellness",
  campus_safety: "Safety",
  overall_satisfaction: "Satisfaction",
};

function ReviewCard({ review, onVote }: { review: ReviewRow; onVote: (id: number, v: 1 | -1) => void }) {
  return (
    <div className="rv-review">
      <div className="rv-review-top">
        <div>
          <span className="rv-review-user">{review.username ?? "Anonymous"}</span>
          <span className="rv-review-badge">{review.attendance_status}</span>
          {review.major && <span className="rv-review-badge">{review.major}</span>}
          {review.year && <span className="rv-review-badge">{review.year}</span>}
        </div>
        <Stars rating={review.overall_rating} />
      </div>

      <div className="rv-review-section-label">Pros</div>
      <div className="rv-review-text">{review.pros}</div>

      <div className="rv-review-section-label">Cons</div>
      <div className="rv-review-text">{review.cons}</div>

      {review.advice && (
        <>
          <div className="rv-review-section-label">Advice for Freshmen</div>
          <div className="rv-review-advice">{review.advice}</div>
        </>
      )}

      {review.tags.length > 0 && (
        <div className="rv-review-tags">
          {review.tags.map((t) => (
            <span key={t} className="rv-review-tag">{t}</span>
          ))}
        </div>
      )}

      <div className="rv-review-footer">
        <span className="rv-review-date">
          {fmtDate(review.created_at)}
          {review.would_recommend === "yes" && " · Would recommend ✓"}
          {review.would_recommend === "no" && " · Would not recommend"}
          {review.would_recommend === "maybe" && " · Maybe recommend"}
        </span>
        <div className="rv-vote-row">
          <button className="rv-vote-btn" onClick={() => onVote(review.id, 1)}>
            👍 {review.upvotes}
          </button>
          <button className="rv-vote-btn" onClick={() => onVote(review.id, -1)}>
            👎 {review.downvotes}
          </button>
        </div>
      </div>
    </div>
  );
}

function SingleCollegeReview({ unitid }: { unitid: number }) {
  const navigate = useNavigate();
  const [data, setData] = useState<CollegeReviewsResponse | null>(null);
  const [detail, setDetail] = useState<CollegeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rv, col] = await Promise.all([
          getCollegeReviews(unitid),
          getCollegeDetail(unitid),
        ]);
        if (!cancelled) { setData(rv); setDetail(col); }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [unitid]);

  const handleVote = async (reviewId: number, vote: 1 | -1) => {
    try {
      const res = await voteReview(reviewId, vote);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reviews: prev.reviews.map((r) =>
            r.id === reviewId ? { ...r, upvotes: res.upvotes, downvotes: res.downvotes } : r
          ),
        };
      });
    } catch { /* ignore */ }
  };

  if (loading) return <div className="rv-inner"><div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>Loading reviews…</div></div>;
  if (!data) return <div className="rv-inner"><div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>Failed to load reviews.</div></div>;

  const { reviews, aggregate } = data;
  const collegeName = detail?.INSTNM ?? `College #${unitid}`;
  const location = [detail?.CITY, detail?.STABBR].filter(Boolean).join(", ");

  const radarLabels = EXPERIENCE_DIMS.map((d) => SHORT_LABELS[d] ?? DIMENSION_LABELS[d]);
  const radarValues = aggregate
    ? EXPERIENCE_DIMS.map((d) => aggregate.dimension_avgs[d] ?? 5)
    : [];

  return (
    <div className="rv-inner">
      <button className="rv-back" onClick={() => navigate("/reviews")}>← Back to reviews</button>

      {/* Header */}
      <div className="rv-header">
        <div className="rv-header-top">
          <div>
            <h1 className="rv-college-name">{collegeName}</h1>
            <p className="rv-college-meta">{location}</p>
          </div>
          {aggregate && (
            <div className="rv-overall">
              <div className="rv-overall-num">{aggregate.avg_overall.toFixed(1)}</div>
              <div className="rv-overall-stars">
                {"★".repeat(Math.round(aggregate.avg_overall))}
                {"☆".repeat(5 - Math.round(aggregate.avg_overall))}
              </div>
              <div className="rv-overall-count">{aggregate.review_count} review{aggregate.review_count !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>
        {aggregate && (
          <div className="rv-recommend">
            <span className="rv-recommend-item">
              <strong>{aggregate.recommend_counts.yes}</strong> recommend
            </span>
            <span className="rv-recommend-item">
              <strong>{aggregate.recommend_counts.maybe}</strong> maybe
            </span>
            <span className="rv-recommend-item">
              <strong>{aggregate.recommend_counts.no}</strong> don't recommend
            </span>
          </div>
        )}
      </div>

      {/* Radar + Tags */}
      {aggregate && (
        <div className="rv-insights">
          <div className="rv-card">
            <div className="rv-card-title">Experience Dimensions (avg)</div>
            <div className="rv-radar-center">
              <SvgRadar
                series={[{ values: radarValues, stroke: "rgba(61,79,124,0.75)", fill: "rgba(61,79,124,0.15)" }]}
                labels={radarLabels}
                max={10}
                size={260}
                theme="light"
              />
            </div>
          </div>
          <div className="rv-card">
            <div className="rv-card-title">Popular Tags</div>
            {aggregate.tag_counts.length > 0 ? (
              <div className="rv-tags">
                {aggregate.tag_counts.map(([tag, count]) => (
                  <span key={tag} className="rv-tag">
                    {tag} <span className="rv-tag-count">{count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No tags yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Write review button */}
      <button className="rv-write-btn" onClick={() => navigate(`/reviews/${unitid}/write`)}>
        ✏️ Write a Review
      </button>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>
          No reviews yet. Be the first!
        </div>
      ) : (
        reviews.map((r) => <ReviewCard key={r.id} review={r} onVote={handleVote} />)
      )}
    </div>
  );
}

function BrowseReviews() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [colleges, setColleges] = useState<CollegeListItem[]>([]);
  const [recent, setRecent] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentReviews(10).then(setRecent).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.length < 2) { setColleges([]); return; }
    const t = setTimeout(() => {
      getColleges(search, "", 10).then(setColleges).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleVote = async (reviewId: number, vote: 1 | -1) => {
    try {
      const res = await voteReview(reviewId, vote);
      setRecent((prev) =>
        prev.map((r) => r.id === reviewId ? { ...r, upvotes: res.upvotes, downvotes: res.downvotes } : r)
      );
    } catch { /* ignore */ }
  };

  return (
    <div className="rv-inner">
      <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#3d4f7c", margin: "0 0 0.25rem", fontSize: "1.6rem" }}>
        College Reviews
      </h1>
      <p style={{ color: "#6b7280", fontSize: "0.88rem", margin: "0 0 1.25rem" }}>
        Read honest reviews from real students. Search for a college or browse recent reviews.
      </p>

      <div className="rv-browse-search">
        <input
          type="text"
          placeholder="Search colleges to read reviews…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {colleges.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {colleges.map((c) => (
            <div
              key={c.UNITID}
              className="rv-review"
              style={{ cursor: "pointer", padding: "0.75rem 1rem" }}
              onClick={() => navigate(`/reviews/${c.UNITID}`)}
            >
              <span style={{ fontWeight: 700, color: "#3d4f7c" }}>{c.INSTNM}</span>
              <span style={{ marginLeft: "0.5rem", fontSize: "0.82rem", color: "#6b7280" }}>
                {c.CITY}, {c.STABBR}
              </span>
            </div>
          ))}
        </div>
      )}

      {search.length < 2 && (
        <>
          <div className="rv-card-title" style={{ marginTop: "0.5rem" }}>Recent Reviews</div>
          {loading ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "2rem" }}>
              No reviews yet. Be the first to share your experience!
            </div>
          ) : (
            recent.map((r) => (
              <div key={r.id}>
                <div
                  style={{ fontSize: "0.78rem", color: "#3d4f7c", fontWeight: 700, marginBottom: "0.2rem", cursor: "pointer" }}
                  onClick={() => navigate(`/reviews/${r.unitid}`)}
                >
                  {r.college_name ?? `College #${r.unitid}`} →
                </div>
                <ReviewCard review={r} onVote={handleVote} />
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export function CollegeReviewPage() {
  const { unitid } = useParams<{ unitid?: string }>();

  return (
    <div className="rv-scroll">
      {unitid ? (
        <SingleCollegeReview unitid={Number(unitid)} />
      ) : (
        <BrowseReviews />
      )}
    </div>
  );
}
