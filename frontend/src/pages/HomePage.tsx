import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getHomeData, getRecentReviews } from "../api";
import type { HomeData, ReviewRow } from "../api";
import "./HomePage.css";

const ACTION_LABELS: Record<string, string> = {
  match_search: "Ran a college match",
  financial_plan: "Created a financial plan",
  save_college: "Saved a college",
  write_review: "Wrote a review",
  profile_update: "Updated profile",
  signup: "Joined EduAlign",
  login: "Logged in",
};

const PROGRESS_ITEMS: { key: string; label: string; link: string }[] = [
  { key: "profile_complete", label: "Complete profile", link: "/profile" },
  { key: "has_match", label: "Run a match", link: "/match" },
  { key: "has_saved", label: "Save a college", link: "/my-colleges" },
  { key: "has_plan", label: "Create a plan", link: "/financial" },
  { key: "has_comparison", label: "Compare colleges", link: "/compare" },
  { key: "has_review", label: "Write a review", link: "/reviews" },
];

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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="home-review-stars">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [home, recent] = await Promise.all([
          getHomeData(),
          getRecentReviews(3),
        ]);
        if (!cancelled) {
          setData(home);
          setReviews(recent);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) {
    return (
      <div className="home-scroll">
        <div className="home-inner">
          <div className="home-empty">Loading your dashboard…</div>
        </div>
      </div>
    );
  }

  const { progress, shortlist, activity, community } = data;
  const pct = progress.total_steps > 0
    ? Math.round((progress.steps_done / progress.total_steps) * 100)
    : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (pct / 100) * circumference;

  const firstTodo = PROGRESS_ITEMS.find(
    (p) => !(progress as unknown as Record<string, boolean>)[p.key]
  );

  return (
    <div className="home-scroll">
      <div className="home-inner">
        {/* ── Welcome + Progress ──────────────────────────────── */}
        <div className="home-welcome">
          <div className="home-welcome-text">
            <h1>Welcome back, {user?.username ?? "Student"}</h1>
            <p>
              {progress.steps_done === progress.total_steps
                ? "You've completed your college search checklist — keep exploring!"
                : firstTodo
                  ? `Next step: ${firstTodo.label}`
                  : "Continue your college search journey."}
            </p>
          </div>
          <div className="home-progress">
            <div className="home-progress-ring">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle className="ring-bg" cx="36" cy="36" r="28" fill="none" strokeWidth="6" />
                <circle
                  className="ring-fill"
                  cx="36" cy="36" r="28" fill="none" strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="home-progress-label">{pct}%</div>
            </div>
            <div className="home-progress-checklist">
              {PROGRESS_ITEMS.map((p) => {
                const done = (progress as unknown as Record<string, boolean>)[p.key];
                return (
                  <span
                    key={p.key}
                    className={`home-progress-item ${done ? "home-progress-item--done" : "home-progress-item--todo"}`}
                    onClick={() => !done && navigate(p.link)}
                    style={!done ? { cursor: "pointer" } : undefined}
                  >
                    {done ? "✓" : "○"} {p.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ───────────────────────────────────── */}
        <div className="home-actions">
          <div className="home-action" onClick={() => navigate("/match")}>
            <span className="home-action-icon">🎯</span>
            <span className="home-action-label">Find Your Match</span>
          </div>
          <div className="home-action" onClick={() => navigate("/financial")}>
            <span className="home-action-icon">💰</span>
            <span className="home-action-label">Financial Planner</span>
          </div>
          <div className="home-action" onClick={() => navigate("/compare")}>
            <span className="home-action-icon">⚖️</span>
            <span className="home-action-label">Compare Colleges</span>
          </div>
          <div className="home-action" onClick={() => navigate("/reviews")}>
            <span className="home-action-icon">⭐</span>
            <span className="home-action-label">Browse Reviews</span>
          </div>
        </div>

        {/* ── Two columns: Shortlist + Activity ───────────────── */}
        <div className="home-columns">
          {/* Left: My Shortlist */}
          <div className="home-card">
            <div className="home-card-title">My Shortlist</div>
            {shortlist.length === 0 ? (
              <div className="home-empty">
                <div className="home-empty-icon">🎓</div>
                Heart colleges from your match results to start building your shortlist.
              </div>
            ) : (
              <div className="home-shortlist-scroll">
                {shortlist.map((s) => (
                  <div
                    key={s.unitid}
                    className="home-shortlist-item"
                    onClick={() => navigate(`/financial?unitid=${s.unitid}`)}
                  >
                    <div className="home-shortlist-name">
                      {s.college_name ?? `College #${s.unitid}`}
                    </div>
                    <div className="home-shortlist-meta">
                      {s.state}
                      {s.adm_rate != null && ` · ${(s.adm_rate * 100).toFixed(0)}% adm`}
                    </div>
                    <span className={`home-shortlist-tier home-tier-${s.tier}`}>
                      {s.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {shortlist.length > 0 && (
              <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
                <span
                  style={{ fontSize: "0.78rem", color: "#3d4f7c", cursor: "pointer", fontWeight: 600 }}
                  onClick={() => navigate("/my-colleges")}
                >
                  View all →
                </span>
              </div>
            )}
          </div>

          {/* Right: Recent Activity */}
          <div className="home-card">
            <div className="home-card-title">Recent Activity</div>
            {activity.length === 0 ? (
              <div className="home-empty">
                <div className="home-empty-icon">📋</div>
                Your activity will show up here as you explore.
              </div>
            ) : (
              activity.map((a) => {
                const meta = a.metadata ?? {};
                let detail = "";
                if (a.action_type === "match_search" && meta.top_college) {
                  detail = ` — ${meta.top_college}`;
                } else if (a.action_type === "financial_plan" && meta.college_name) {
                  detail = ` — ${meta.college_name}`;
                } else if (a.action_type === "write_review") {
                  detail = ` (${meta.overall_rating}★)`;
                }
                return (
                  <div key={a.id} className="home-activity-item">
                    <span className={`home-activity-dot home-dot-${a.action_type}`} />
                    <div>
                      <div className="home-activity-text">
                        <strong>{ACTION_LABELS[a.action_type] ?? a.action_type}</strong>
                        {detail}
                      </div>
                      <div className="home-activity-date">{fmtDate(a.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Featured Reviews ────────────────────────────────── */}
        <div className="home-card" style={{ marginBottom: "1.5rem" }}>
          <div className="home-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Latest Reviews</span>
            <span
              style={{ fontSize: "0.75rem", color: "#3d4f7c", cursor: "pointer", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}
              onClick={() => navigate("/reviews")}
            >
              Browse all →
            </span>
          </div>
          {reviews.length === 0 ? (
            <div className="home-empty">
              <div className="home-empty-icon">⭐</div>
              No reviews yet. Be the first to share your college experience!
            </div>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="home-review-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/reviews/${r.unitid}`)}
              >
                <div className="home-review-header">
                  <span className="home-review-college">{r.college_name ?? `College #${r.unitid}`}</span>
                  <Stars rating={r.overall_rating} />
                </div>
                <div className="home-review-snippet">{r.pros}</div>
                <div className="home-review-footer">
                  {r.username ?? "Anonymous"} · {r.attendance_status}
                  {r.major && ` · ${r.major}`}
                  {r.created_at && ` · ${fmtDate(r.created_at)}`}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Community Stats ─────────────────────────────────── */}
        <div className="home-card">
          <div className="home-community">
            <div className="home-community-stat">
              <div className="home-community-val">{community.total_users}</div>
              <div className="home-community-label">Students</div>
            </div>
            <div className="home-community-stat">
              <div className="home-community-val">{community.total_reviews}</div>
              <div className="home-community-label">Reviews</div>
            </div>
            <div className="home-community-stat">
              <div className="home-community-val">{community.colleges_reviewed}</div>
              <div className="home-community-label">Colleges Reviewed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
