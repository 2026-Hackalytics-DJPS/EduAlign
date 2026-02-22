import { useState, useEffect, useMemo } from "react";
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
import {
  Search, PenLine, ThumbsUp, ThumbsDown, ArrowLeft,
  Star, MapPin, ChevronRight, MessageSquareText,
  CheckCircle2, XCircle, HelpCircle, SlidersHorizontal,
  TrendingUp, Users, GraduationCap,
} from "lucide-react";
import "./CollegeReviewPage.css";

type SortMode = "recent" | "highest" | "lowest" | "helpful";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="rv-star-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? "rv-star-filled" : "rv-star-empty"}
          fill={n <= rating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  const initials = (review.username ?? "A").slice(0, 2).toUpperCase();

  return (
    <div className="rv-review">
      <div className="rv-review-top">
        <div className="rv-review-author">
          <span className="rv-review-avatar">{initials}</span>
          <div>
            <span className="rv-review-user">{review.username ?? "Anonymous"}</span>
            <div className="rv-review-badges">
              <span className="rv-review-badge">{review.attendance_status}</span>
              {review.major && <span className="rv-review-badge">{review.major}</span>}
              {review.year && <span className="rv-review-badge">{review.year}</span>}
            </div>
          </div>
        </div>
        <div className="rv-review-rating-col">
          <StarRating rating={review.overall_rating} />
          <span className="rv-review-date">{fmtDate(review.created_at)}</span>
        </div>
      </div>

      <div className="rv-review-body">
        <div className="rv-review-section">
          <div className="rv-review-section-label">
            <CheckCircle2 size={13} /> Pros
          </div>
          <div className="rv-review-text">{review.pros}</div>
        </div>

        <div className="rv-review-section">
          <div className="rv-review-section-label">
            <XCircle size={13} /> Cons
          </div>
          <div className="rv-review-text">{review.cons}</div>
        </div>

        {review.advice && (
          <div className="rv-review-advice">
            <div className="rv-review-advice-label">
              <GraduationCap size={13} /> Advice for Freshmen
            </div>
            <div className="rv-review-advice-text">{review.advice}</div>
          </div>
        )}
      </div>

      {review.tags.length > 0 && (
        <div className="rv-review-tags">
          {review.tags.map((t) => (
            <span key={t} className="rv-review-tag">{t}</span>
          ))}
        </div>
      )}

      <div className="rv-review-footer">
        <span className="rv-review-recommend">
          {review.would_recommend === "yes" && (
            <><CheckCircle2 size={13} className="rv-recommend-yes" /> Would recommend</>
          )}
          {review.would_recommend === "no" && (
            <><XCircle size={13} className="rv-recommend-no" /> Would not recommend</>
          )}
          {review.would_recommend === "maybe" && (
            <><HelpCircle size={13} className="rv-recommend-maybe" /> Maybe recommend</>
          )}
        </span>
        <div className="rv-vote-row">
          <button className="rv-vote-btn" onClick={() => onVote(review.id, 1)} title="Helpful">
            <ThumbsUp size={14} />
            <span>{review.upvotes}</span>
          </button>
          <button className="rv-vote-btn rv-vote-btn--down" onClick={() => onVote(review.id, -1)} title="Not helpful">
            <ThumbsDown size={14} />
            <span>{review.downvotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingBreakdown({ reviews }: { reviews: ReviewRow[] }) {
  const counts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => { if (r.overall_rating >= 1 && r.overall_rating <= 5) counts[r.overall_rating - 1]!++; });
  const total = reviews.length || 1;

  return (
    <div className="rv-breakdown">
      {[5, 4, 3, 2, 1].map((n) => {
        const count = counts[n - 1] ?? 0;
        const pct = (count / total) * 100;
        return (
          <div key={n} className="rv-breakdown-row">
            <span className="rv-breakdown-label">{n}</span>
            <Star size={12} fill="currentColor" className="rv-breakdown-star" />
            <div className="rv-breakdown-bar">
              <div className="rv-breakdown-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="rv-breakdown-count">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function SingleCollegeReview({ unitid }: { unitid: number }) {
  const navigate = useNavigate();
  const [data, setData] = useState<CollegeReviewsResponse | null>(null);
  const [detail, setDetail] = useState<CollegeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("recent");
  const [filterStar, setFilterStar] = useState<number | null>(null);

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

  const sortedReviews = useMemo(() => {
    if (!data) return [];
    let filtered = data.reviews;
    if (filterStar !== null) {
      filtered = filtered.filter((r) => r.overall_rating === filterStar);
    }
    const sorted = [...filtered];
    switch (sort) {
      case "highest": sorted.sort((a, b) => b.overall_rating - a.overall_rating); break;
      case "lowest": sorted.sort((a, b) => a.overall_rating - b.overall_rating); break;
      case "helpful": sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)); break;
      default: sorted.sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime());
    }
    return sorted;
  }, [data, sort, filterStar]);

  if (loading) return <div className="rv-inner"><div className="rv-loading">Loading reviews...</div></div>;
  if (!data) return <div className="rv-inner"><div className="rv-loading">Failed to load reviews.</div></div>;

  const { aggregate } = data;
  const collegeName = detail?.INSTNM ?? `College #${unitid}`;
  const location = [detail?.CITY, detail?.STABBR].filter(Boolean).join(", ");

  const radarLabels = EXPERIENCE_DIMS.map((d) => SHORT_LABELS[d] ?? DIMENSION_LABELS[d]);
  const radarValues = aggregate
    ? EXPERIENCE_DIMS.map((d) => aggregate.dimension_avgs[d] ?? 5)
    : [];

  const totalRecommend = aggregate
    ? aggregate.recommend_counts.yes + aggregate.recommend_counts.maybe + aggregate.recommend_counts.no
    : 0;
  const recommendPct = totalRecommend > 0
    ? Math.round((aggregate!.recommend_counts.yes / totalRecommend) * 100)
    : 0;

  return (
    <div className="rv-inner">
      <button className="rv-back" onClick={() => navigate("/reviews")}>
        <ArrowLeft size={16} /> Back to reviews
      </button>

      {/* Header */}
      <div className="rv-header">
        <div className="rv-header-top">
          <div>
            <h1 className="rv-college-name">{collegeName}</h1>
            {location && (
              <p className="rv-college-meta">
                <MapPin size={14} /> {location}
              </p>
            )}
          </div>
          {aggregate && (
            <div className="rv-overall">
              <div className="rv-overall-num">{aggregate.avg_overall.toFixed(1)}</div>
              <StarRating rating={Math.round(aggregate.avg_overall)} size={18} />
              <div className="rv-overall-count">
                {aggregate.review_count} review{aggregate.review_count !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>

        {aggregate && (
          <div className="rv-recommend-bar">
            <div className="rv-recommend-fill" style={{ width: `${recommendPct}%` }} />
            <span className="rv-recommend-text">
              <TrendingUp size={14} /> {recommendPct}% would recommend
            </span>
          </div>
        )}
      </div>

      {/* Stats row: Breakdown + Radar + Tags */}
      {aggregate && (
        <div className="rv-insights">
          <div className="rv-card">
            <div className="rv-card-title">Rating Breakdown</div>
            <RatingBreakdown reviews={data.reviews} />
          </div>
          <div className="rv-card">
            <div className="rv-card-title">Experience Dimensions</div>
            <div className="rv-radar-center">
              <SvgRadar
                series={[{ values: radarValues, stroke: "rgba(61,79,124,0.75)", fill: "rgba(61,79,124,0.15)" }]}
                labels={radarLabels}
                max={10}
                size={240}
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
              <div className="rv-muted">No tags yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className="rv-controls">
        <button className="rv-write-btn" onClick={() => navigate(`/reviews/${unitid}/write`)}>
          <PenLine size={16} /> Write a Review
        </button>

        <div className="rv-controls-right">
          <div className="rv-sort">
            <SlidersHorizontal size={14} />
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
          <div className="rv-filter-stars">
            {[5, 4, 3, 2, 1].map((n) => (
              <button
                key={n}
                className={`rv-filter-btn${filterStar === n ? " active" : ""}`}
                onClick={() => setFilterStar(filterStar === n ? null : n)}
                title={`${n} star reviews`}
              >
                {n}<Star size={11} fill="currentColor" />
              </button>
            ))}
            {filterStar !== null && (
              <button className="rv-filter-clear" onClick={() => setFilterStar(null)}>Clear</button>
            )}
          </div>
        </div>
      </div>

      {/* Reviews count */}
      <div className="rv-results-count">
        <MessageSquareText size={15} />
        {sortedReviews.length} review{sortedReviews.length !== 1 ? "s" : ""}
        {filterStar !== null && ` (${filterStar}-star only)`}
      </div>

      {/* Reviews list */}
      {sortedReviews.length === 0 ? (
        <div className="rv-empty-state">
          <MessageSquareText size={32} />
          <div className="rv-empty-title">
            {filterStar !== null ? `No ${filterStar}-star reviews yet` : "No reviews yet"}
          </div>
          <div className="rv-empty-sub">
            {filterStar !== null
              ? "Try a different filter or write one yourself!"
              : "Be the first to share your experience at this college."}
          </div>
        </div>
      ) : (
        sortedReviews.map((r) => <ReviewCard key={r.id} review={r} onVote={handleVote} />)
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
      {/* Hero */}
      <div className="rv-hero">
        <h1 className="rv-hero-title">College Reviews</h1>
        <p className="rv-hero-sub">
          Honest reviews from real students. Search for a college or browse the latest.
        </p>
        <div className="rv-browse-search">
          <Search size={18} className="rv-search-icon" />
          <input
            type="text"
            placeholder="Search for a college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* College search results */}
      {colleges.length > 0 && (
        <div className="rv-search-results">
          {colleges.map((c) => (
            <div
              key={c.UNITID}
              className="rv-search-card"
              onClick={() => navigate(`/reviews/${c.UNITID}`)}
            >
              <div className="rv-search-card-info">
                <span className="rv-search-card-name">{c.INSTNM}</span>
                <span className="rv-search-card-loc">
                  <MapPin size={12} /> {c.CITY}, {c.STABBR}
                </span>
              </div>
              <ChevronRight size={18} className="rv-search-card-arrow" />
            </div>
          ))}
        </div>
      )}

      {/* Recent reviews */}
      {search.length < 2 && (
        <>
          <div className="rv-section-header">
            <MessageSquareText size={16} />
            <span>Recent Reviews</span>
            <Users size={14} className="rv-section-badge" />
          </div>

          {loading ? (
            <div className="rv-loading">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="rv-empty-state">
              <PenLine size={32} />
              <div className="rv-empty-title">No reviews yet</div>
              <div className="rv-empty-sub">Be the first to share your college experience!</div>
            </div>
          ) : (
            recent.map((r) => (
              <div key={r.id} className="rv-recent-wrap">
                <button
                  className="rv-recent-college"
                  onClick={() => navigate(`/reviews/${r.unitid}`)}
                >
                  {r.college_name ?? `College #${r.unitid}`}
                  <ChevronRight size={14} />
                </button>
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
