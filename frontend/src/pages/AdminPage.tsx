import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Plot from "react-plotly.js";
import { useAuth } from "../contexts/AuthContext";
import {
  getAdminDashboard,
  getAdminStats,
  getAdminActivity,
  getAdminSignupsOverTime,
  getAdminMatchAnalytics,
  getAdminProfileInsights,
  toggleUserAdmin,
  deleteUser,
  type AuthUser,
  type AdminStats,
  type ActivityRow,
  type SignupDay,
  type MatchAnalytics,
  type ProfileInsights,
} from "../api";

// ── Constants ───────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "users"
  | "match"
  | "financial"
  | "profile"
  | "activity";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users" },
  { key: "match", label: "Match Analytics" },
  { key: "financial", label: "Financial Analytics" },
  { key: "profile", label: "Profile Insights" },
  { key: "activity", label: "Activity Log" },
];

const DOT_COLORS: Record<string, string> = {
  signup: "#22c55e",
  login: "#3b82f6",
  match_search: "#a78bfa",
  financial_plan: "#fb923c",
  profile_update: "#9ca3af",
};

const CHART_PALETTE = ["#4a5080", "#6b7db3", "#a8b8d8", "#e8f0e8"];

const PLOTLY_LAYOUT_BASE: Partial<Plotly.Layout> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "'Playfair Display', Georgia, serif", color: "#4a5080" },
  margin: { l: 50, r: 20, t: 30, b: 50 },
};

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  responsive: true,
};

const ACTION_LABELS: Record<string, string> = {
  signup: "Signed up",
  login: "Logged in",
  match_search: "Searched for matches",
  financial_plan: "Created financial plan",
  profile_update: "Updated profile",
};

// ── CSS-in-JS Stylesheet ────────────────────────────────────────────────────

const stylesheet = `
  .adm-page { margin: -2rem -2.5rem; min-height: 100vh; background: #e8f0e8; }

  .adm-header {
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem 2.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .adm-header-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #4a5080;
    margin: 0;
  }
  .adm-header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .adm-header-user {
    font-size: 0.88rem;
    color: #6b7280;
    font-weight: 500;
  }
  .adm-back-btn {
    padding: 0.4rem 1rem;
    border-radius: 999px;
    border: 1.5px solid #4a5080;
    background: transparent;
    color: #4a5080;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .adm-back-btn:hover {
    background: #4a5080;
    color: #fff;
  }

  .adm-tabs {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0 2.5rem;
  }
  .adm-tabs::-webkit-scrollbar { display: none; }

  .adm-tab {
    padding: 0.85rem 1.25rem;
    border: none;
    background: transparent;
    color: #6b7280;
    font-size: 0.88rem;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2.5px solid transparent;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  .adm-tab:hover {
    color: #4a5080;
  }
  .adm-tab.active {
    color: #4a5080;
    font-weight: 600;
    border-bottom-color: #4a5080;
  }

  .adm-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 2rem;
  }

  .adm-card {
    background: #fff;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
    margin-bottom: 1.5rem;
    transition: all 0.2s ease;
  }

  .adm-card-title {
    font-family: 'Playfair Display', Georgia, serif;
    color: #4a5080;
    margin: 0 0 1rem 0;
    font-size: 1.3rem;
  }
  .adm-card-h2 {
    font-family: 'Playfair Display', Georgia, serif;
    color: #4a5080;
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  /* KPI grid */
  .adm-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  @media (max-width: 768px) {
    .adm-kpi-grid { grid-template-columns: 1fr; }
  }
  .adm-kpi {
    background: #fff;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.2s ease;
    cursor: default;
  }
  .adm-kpi:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }
  .adm-kpi-label {
    font-size: 0.72rem;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .adm-kpi-value {
    font-size: 1.65rem;
    font-weight: 700;
    color: #4a5080;
    line-height: 1.1;
  }
  .adm-kpi-sub {
    font-size: 0.78rem;
    color: #9ca3af;
  }

  /* Stat cards row */
  .adm-stat-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .adm-stat-card {
    background: #fff;
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 8px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 180;
    transition: all 0.2s ease;
  }
  .adm-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  }

  /* Users table */
  .adm-search-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
  }
  .adm-search-input {
    padding: 0.5rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.88rem;
    font-family: inherit;
    min-width: 220px;
    transition: all 0.2s ease;
  }
  .adm-search-input:focus {
    outline: none;
    border-color: #4a5080;
    box-shadow: 0 0 0 2px rgba(74,80,128,0.12);
  }
  .adm-select {
    padding: 0.5rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.88rem;
    font-family: inherit;
    transition: all 0.2s ease;
  }
  .adm-select:focus {
    outline: none;
    border-color: #4a5080;
  }
  .adm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  .adm-table th {
    text-align: left;
    padding: 0.65rem 0.85rem;
    background: #f3f4f6;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    font-weight: 600;
    border-bottom: 1px solid #e5e7eb;
  }
  .adm-table td {
    padding: 0.65rem 0.85rem;
    border-bottom: 1px solid #f0f0f0;
  }
  .adm-table tr:nth-child(even) td {
    background: #f8faf8;
  }
  .adm-table tr:hover td {
    background: #f0f4f0;
  }

  .adm-pill {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  .adm-pill-filled {
    color: #fff;
  }
  .adm-pill-outline-blue {
    border: 1.5px solid #4a5080;
    color: #4a5080;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    margin-right: 6px;
  }
  .adm-pill-outline-blue:hover:not(:disabled) {
    background: #4a5080;
    color: #fff;
  }
  .adm-pill-outline-blue:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .adm-pill-outline-red {
    border: 1.5px solid #dc2626;
    color: #dc2626;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
  }
  .adm-pill-outline-red:hover:not(:disabled) {
    background: #dc2626;
    color: #fff;
  }
  .adm-pill-outline-red:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* Modal */
  .adm-overlay {
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .adm-modal {
    background: #fff;
    border-radius: 20px;
    padding: 2.5rem 2rem;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 30px rgba(0,0,0,0.18);
    text-align: center;
    transition: all 0.2s ease;
  }
  .adm-modal p {
    margin: 0 0 1.5rem;
    font-size: 0.95rem;
    color: #333;
    line-height: 1.5;
  }
  .adm-modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  .adm-modal-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s ease;
    border: none;
  }
  .adm-modal-cancel {
    background: #f3f4f6;
    color: #6b7280;
  }
  .adm-modal-cancel:hover { background: #e5e7eb; }
  .adm-modal-delete {
    background: #dc2626;
    color: #fff;
  }
  .adm-modal-delete:hover { background: #b91c1c; }

  /* Toast */
  .adm-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    font-size: 0.88rem;
    font-weight: 500;
    color: #fff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }

  /* Activity timeline */
  .adm-date-divider {
    font-size: 0.78rem;
    font-weight: 600;
    color: #4a5080;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0 0.4rem;
    margin-top: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .adm-timeline-row {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    padding: 0.75rem 0;
  }
  .adm-dot-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 4px;
    flex-shrink: 0;
  }
  .adm-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .adm-dot-line {
    width: 1.5px;
    flex: 1;
    min-height: 18px;
    background: #e5e7eb;
  }
  .adm-tl-body {
    flex: 1;
    min-width: 0;
  }
  .adm-tl-time {
    font-size: 0.75rem;
    color: #9ca3af;
  }
  .adm-tl-user {
    font-weight: 600;
    color: #4a5080;
    font-size: 0.88rem;
  }
  .adm-tl-action {
    color: #374151;
    font-size: 0.88rem;
  }
  .adm-tl-meta {
    font-size: 0.78rem;
    color: #9ca3af;
    margin-top: 2px;
  }

  .adm-empty {
    color: #9ca3af;
    text-align: center;
    padding: 2rem;
    font-size: 0.95rem;
  }

  .adm-count {
    font-size: 0.82rem;
    color: #9ca3af;
    font-weight: 400;
  }
`;

// ── Component ───────────────────────────────────────────────────────────────

export function AdminPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [toast, setToast] = useState<{
    msg: string;
    type: "error" | "success";
  } | null>(null);

  const showToast = useCallback(
    (msg: string, type: "error" | "success" = "error") => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  // ── Data state ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [signupDays, setSignupDays] = useState<SignupDay[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [matchAnalytics, setMatchAnalytics] = useState<MatchAnalytics | null>(
    null
  );
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [profileInsights, setProfileInsights] =
    useState<ProfileInsights | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Users section filters ───────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  // ── Confirm dialog ──────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    msg: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Data loading (keyed only on section to avoid re-render loops) ──────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        switch (section) {
          case "overview": {
            const [s, sd] = await Promise.all([
              getAdminStats(),
              getAdminSignupsOverTime(),
            ]);
            if (!cancelled) { setStats(s); setSignupDays(sd); }
            break;
          }
          case "users": {
            const res = await getAdminDashboard();
            if (!cancelled) setUsers(res.users);
            break;
          }
          case "match": {
            const [ma, s] = await Promise.all([
              getAdminMatchAnalytics(),
              getAdminStats(),
            ]);
            if (!cancelled) { setMatchAnalytics(ma); setStats(s); }
            break;
          }
          case "financial":
          case "activity": {
            const a = await getAdminActivity();
            if (!cancelled) setActivity(a);
            break;
          }
          case "profile": {
            const p = await getAdminProfileInsights();
            if (!cancelled) setProfileInsights(p);
            break;
          }
        }
      } catch (err) {
        if (!cancelled) {
          showToast(
            err instanceof Error ? err.message : "Failed to load admin data",
            "error",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [section, showToast]);

  // Auto-refresh activity log every 30s
  useEffect(() => {
    if (section !== "activity") return;
    const id = setInterval(async () => {
      try {
        const a = await getAdminActivity();
        setActivity(a);
      } catch {}
    }, 30_000);
    return () => clearInterval(id);
  }, [section]);

  // ── User management actions ─────────────────────────────────────────────
  const handleToggleAdmin = useCallback(
    async (userId: number) => {
      try {
        const updated = await toggleUserAdmin(userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? updated : u))
        );
        showToast(
          `${updated.username} is now ${updated.is_admin ? "admin" : "regular user"}`,
          "success"
        );
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to toggle admin";
        showToast(msg);
      }
    },
    [showToast]
  );

  const handleDelete = useCallback(
    async (userId: number) => {
      try {
        await deleteUser(userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        showToast("User deleted", "success");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to delete";
        showToast(msg);
      }
      setConfirmDialog(null);
    },
    [showToast]
  );

  // ── Filtered users ─────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }
    if (userFilter === "admins") list = list.filter((u) => u.is_admin);
    else if (userFilter === "complete")
      list = list.filter((u) => u.profile_complete);
    else if (userFilter === "incomplete")
      list = list.filter((u) => !u.profile_complete);
    return list;
  }, [users, search, userFilter]);

  // ── Financial data derived from activity ────────────────────────────────
  const financialRows = useMemo(
    () => activity.filter((a) => a.action_type === "financial_plan"),
    [activity]
  );

  const financialCollegeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    financialRows.forEach((r) => {
      const name =
        (r.metadata?.college_name as string) || "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [financialRows]);

  const inStateVsOut = useMemo(() => {
    let inState = 0;
    let outState = 0;
    financialRows.forEach((r) => {
      const meta = r.metadata;
      if (!meta) return;
      if (meta.in_state === true || meta.in_state === "true") inState++;
      else outState++;
    });
    return { inState, outState };
  }, [financialRows]);

  // ── Activity grouped by date ───────────────────────────────────────────
  const activityByDate = useMemo(() => {
    const groups: { date: string; items: ActivityRow[] }[] = [];
    let currentDate = "";
    for (const a of activity) {
      const d = a.created_at
        ? new Date(a.created_at).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "Unknown";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, items: [] });
      }
      groups[groups.length - 1]!.items.push(a);
    }
    return groups;
  }, [activity]);

  // ── Render sections ────────────────────────────────────────────────────

  const renderOverview = () => {
    if (!stats) return null;
    const kpis: { label: string; value: string | number; sub: string }[] = [
      { label: "Total Users", value: stats.total_users, sub: "All registered accounts" },
      { label: "Profiles Complete", value: stats.profiles_complete, sub: `${stats.total_users ? Math.round((stats.profiles_complete / stats.total_users) * 100) : 0}% completion rate` },
      { label: "Signups (7 Days)", value: stats.signups_last_7_days, sub: "New this week" },
      { label: "Total Matches", value: stats.total_matches_run, sub: "College match searches" },
      { label: "Financial Plans", value: stats.total_financial_plans_run, sub: "Plans generated" },
      { label: "Top College", value: stats.most_searched_college ?? "—", sub: "Most searched" },
    ];

    return (
      <>
        <div className="adm-kpi-grid">
          {kpis.map((k) => (
            <div key={k.label} className="adm-kpi">
              <span className="adm-kpi-label">{k.label}</span>
              <span className="adm-kpi-value">{k.value}</span>
              <span className="adm-kpi-sub">{k.sub}</span>
            </div>
          ))}
        </div>

        <div className="adm-card">
          <h2 className="adm-card-h2">Signups Over 30 Days</h2>
          {signupDays.length > 0 ? (
            <Plot
              data={[
                {
                  x: signupDays.map((d) => d.date),
                  y: signupDays.map((d) => d.count),
                  type: "scatter",
                  mode: "lines+markers",
                  line: { color: CHART_PALETTE[0], width: 2.5, shape: "spline" },
                  marker: { color: CHART_PALETTE[0], size: 7 },
                  fill: "tozeroy",
                  fillcolor: "rgba(74,80,128,0.08)",
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                xaxis: { title: "Date", gridcolor: "#f0f0f0" },
                yaxis: { title: "Signups", dtick: 1, gridcolor: "#f0f0f0" },
                height: 300,
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%" }}
            />
          ) : (
            <p className="adm-empty">No signup data for the last 30 days.</p>
          )}
        </div>
      </>
    );
  };

  const renderUsers = () => (
    <div className="adm-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 className="adm-card-title" style={{ margin: 0 }}>Users</h1>
        <div className="adm-search-row" style={{ margin: 0 }}>
          <span className="adm-count">
            {filteredUsers.length} result{filteredUsers.length !== 1 && "s"}
          </span>
          <select
            className="adm-select"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="admins">Admins Only</option>
            <option value="complete">Profile Complete</option>
            <option value="incomplete">Profile Incomplete</option>
          </select>
          <input
            className="adm-search-input"
            placeholder="Search username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Created</th>
              <th>Profile</th>
              <th>Admin</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id}>
                  <td style={{ color: "#9ca3af" }}>{u.id}</td>
                  <td style={{ fontWeight: 500, color: "#1f2937" }}>{u.username}</td>
                  <td style={{ color: "#6b7280" }}>{u.email ?? "—"}</td>
                  <td style={{ color: "#6b7280" }}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span
                      className="adm-pill adm-pill-filled"
                      style={{
                        background: u.profile_complete ? "#15803d" : "#d97706",
                      }}
                    >
                      {u.profile_complete ? "Complete" : "Incomplete"}
                    </span>
                  </td>
                  <td>
                    <span
                      className="adm-pill adm-pill-filled"
                      style={{
                        background: u.is_admin ? "#4a5080" : "#d1d5db",
                        color: u.is_admin ? "#fff" : "#6b7280",
                      }}
                    >
                      {u.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="adm-pill adm-pill-outline-blue"
                      disabled={isSelf}
                      title={isSelf ? "Cannot change your own status" : undefined}
                      onClick={() => handleToggleAdmin(u.id)}
                    >
                      {u.is_admin ? "Demote" : "Promote"}
                    </button>
                    <button
                      className="adm-pill adm-pill-outline-red"
                      disabled={isSelf}
                      title={isSelf ? "Cannot delete your own account" : undefined}
                      onClick={() =>
                        setConfirmDialog({
                          msg: `Delete user "${u.username}"? This action cannot be undone.`,
                          onConfirm: () => handleDelete(u.id),
                        })
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMatchAnalytics = () => {
    if (!matchAnalytics) return null;
    const colleges = matchAnalytics.top_matched_colleges;
    return (
      <>
        <div className="adm-stat-row">
          <div className="adm-stat-card">
            <span className="adm-kpi-label">Average Similarity</span>
            <span className="adm-kpi-value">
              {matchAnalytics.average_similarity_score != null
                ? matchAnalytics.average_similarity_score.toFixed(4)
                : "—"}
            </span>
          </div>
          <div className="adm-stat-card">
            <span className="adm-kpi-label">Groq LLM vs Cosine</span>
            <span className="adm-kpi-value">
              {stats?.groq_vs_fallback_ratio ?? "—"}
            </span>
          </div>
          <div className="adm-stat-card">
            <span className="adm-kpi-label">Total Searches</span>
            <span className="adm-kpi-value">
              {matchAnalytics.total_match_searches}
            </span>
          </div>
        </div>

        {colleges.length > 0 && (
          <div className="adm-card">
            <h2 className="adm-card-h2">Top 10 Matched Colleges</h2>
            <Plot
              data={[
                {
                  y: colleges.map((c) => c.college).reverse(),
                  x: colleges.map((c) => c.count).reverse(),
                  type: "bar",
                  orientation: "h",
                  marker: {
                    color: colleges.map((_, i) =>
                      CHART_PALETTE[i % CHART_PALETTE.length]
                    ).reverse(),
                  },
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 220, r: 20, t: 10, b: 40 },
                xaxis: { title: "Searches", gridcolor: "#f0f0f0" },
                height: Math.max(300, colleges.length * 38),
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </>
    );
  };

  const renderFinancial = () => (
    <>
      <div className="adm-stat-row">
        <div className="adm-stat-card">
          <span className="adm-kpi-label">Total Financial Plans</span>
          <span className="adm-kpi-value">{financialRows.length}</span>
        </div>
      </div>

      {financialCollegeCounts.length > 0 && (
        <div className="adm-card">
          <h2 className="adm-card-h2">Most Planned Colleges</h2>
          <Plot
            data={[
              {
                y: financialCollegeCounts.map(([c]) => c).reverse(),
                x: financialCollegeCounts.map(([, n]) => n).reverse(),
                type: "bar",
                orientation: "h",
                marker: {
                  color: financialCollegeCounts.map((_, i) =>
                    CHART_PALETTE[i % CHART_PALETTE.length]
                  ).reverse(),
                },
              },
            ]}
            layout={{
              ...PLOTLY_LAYOUT_BASE,
              margin: { l: 220, r: 20, t: 10, b: 40 },
              xaxis: { title: "Plans", gridcolor: "#f0f0f0" },
              height: Math.max(260, financialCollegeCounts.length * 38),
            }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {(inStateVsOut.inState > 0 || inStateVsOut.outState > 0) && (
        <div className="adm-card">
          <h2 className="adm-card-h2">In-State vs Out-of-State</h2>
          <Plot
            data={[
              {
                labels: ["In-State", "Out-of-State"],
                values: [inStateVsOut.inState, inStateVsOut.outState],
                type: "pie",
                marker: { colors: [CHART_PALETTE[0], CHART_PALETTE[1]] },
                textinfo: "label+percent",
                hole: 0.4,
              },
            ]}
            layout={{
              ...PLOTLY_LAYOUT_BASE,
              height: 300,
              showlegend: true,
            }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", maxWidth: 420 }}
          />
        </div>
      )}

      {financialRows.length === 0 && (
        <p className="adm-empty">No financial plan data yet.</p>
      )}
    </>
  );

  const renderProfileInsights = () => {
    if (!profileInsights) return null;
    const { gpa_distribution, major_counts, state_counts, school_size_breakdown } =
      profileInsights;

    const gpaLabels = Object.keys(gpa_distribution).sort();
    const gpaValues = gpaLabels.map((k) => gpa_distribution[k]);
    const sizeLabels = Object.keys(school_size_breakdown);
    const sizeValues = sizeLabels.map((k) => school_size_breakdown[k]);

    return (
      <>
        <div className="adm-stat-row">
          <div className="adm-stat-card">
            <span className="adm-kpi-label">Completed Profiles</span>
            <span className="adm-kpi-value">{profileInsights.total_profiles}</span>
          </div>
        </div>

        {major_counts.length > 0 && (
          <div className="adm-card">
            <h2 className="adm-card-h2">Top Intended Majors</h2>
            <Plot
              data={[
                {
                  y: major_counts.slice(0, 10).map((m) => m.major).reverse(),
                  x: major_counts.slice(0, 10).map((m) => m.count).reverse(),
                  type: "bar",
                  orientation: "h",
                  marker: {
                    color: major_counts.slice(0, 10).map((_, i) =>
                      CHART_PALETTE[i % CHART_PALETTE.length]
                    ).reverse(),
                  },
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 180, r: 20, t: 10, b: 40 },
                xaxis: { title: "Students", gridcolor: "#f0f0f0" },
                height: Math.max(260, major_counts.slice(0, 10).length * 34),
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {gpaLabels.length > 0 && (
          <div className="adm-card">
            <h2 className="adm-card-h2">GPA Distribution</h2>
            <Plot
              data={[
                {
                  x: gpaLabels,
                  y: gpaValues,
                  type: "bar",
                  marker: { color: CHART_PALETTE[0] },
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                xaxis: { title: "GPA Range", gridcolor: "#f0f0f0" },
                yaxis: { title: "Students", dtick: 1, gridcolor: "#f0f0f0" },
                height: 300,
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {state_counts.length > 0 && (
          <div className="adm-card">
            <h2 className="adm-card-h2">Top Preferred States</h2>
            <Plot
              data={[
                {
                  y: state_counts.slice(0, 10).map((s) => s.state).reverse(),
                  x: state_counts.slice(0, 10).map((s) => s.count).reverse(),
                  type: "bar",
                  orientation: "h",
                  marker: {
                    color: state_counts.slice(0, 10).map((_, i) =>
                      CHART_PALETTE[i % CHART_PALETTE.length]
                    ).reverse(),
                  },
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                margin: { l: 60, r: 20, t: 10, b: 40 },
                xaxis: { title: "Students", gridcolor: "#f0f0f0" },
                height: Math.max(260, state_counts.slice(0, 10).length * 34),
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {sizeLabels.length > 0 && (
          <div className="adm-card">
            <h2 className="adm-card-h2">School Size Preference</h2>
            <Plot
              data={[
                {
                  labels: sizeLabels,
                  values: sizeValues,
                  type: "pie",
                  marker: { colors: CHART_PALETTE },
                  textinfo: "label+percent",
                  hole: 0.4,
                },
              ]}
              layout={{
                ...PLOTLY_LAYOUT_BASE,
                height: 320,
                showlegend: true,
              }}
              config={PLOTLY_CONFIG}
              style={{ width: "100%", maxWidth: 420 }}
            />
          </div>
        )}
      </>
    );
  };

  const renderActivity = () => (
    <div className="adm-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <h1 className="adm-card-title" style={{ margin: 0 }}>Activity Log</h1>
        <span className="adm-count">Last 50 events &middot; auto-refreshes every 30s</span>
      </div>

      {activity.length === 0 ? (
        <p className="adm-empty">No activity recorded yet.</p>
      ) : (
        activityByDate.map((group) => (
          <div key={group.date}>
            <div className="adm-date-divider">{group.date}</div>
            {group.items.map((a, idx) => {
              const color = DOT_COLORS[a.action_type] ?? "#9ca3af";
              const label = ACTION_LABELS[a.action_type] ?? a.action_type;
              let metaSummary = "";
              if (a.metadata) {
                if (a.action_type === "match_search")
                  metaSummary = (a.metadata.top_college as string) ?? "";
                else if (a.action_type === "financial_plan")
                  metaSummary = (a.metadata.college_name as string) ?? "";
              }
              return (
                <div key={a.id} className="adm-timeline-row">
                  <div className="adm-dot-col">
                    <div className="adm-dot" style={{ background: color }} />
                    {idx < group.items.length - 1 && <div className="adm-dot-line" />}
                  </div>
                  <div className="adm-tl-body">
                    <div>
                      <span className="adm-tl-user">{a.username ?? "anonymous"}</span>
                      {" "}
                      <span className="adm-tl-action">{label}</span>
                    </div>
                    {metaSummary && (
                      <div className="adm-tl-meta">{metaSummary}</div>
                    )}
                    <div className="adm-tl-time">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );

  const sectionRenderers: Record<Section, () => React.ReactNode> = {
    overview: renderOverview,
    users: renderUsers,
    match: renderMatchAnalytics,
    financial: renderFinancial,
    profile: renderProfileInsights,
    activity: renderActivity,
  };

  return (
    <>
      <style>{stylesheet}</style>

      {toast && (
        <div
          className="adm-toast"
          style={{ background: toast.type === "error" ? "#dc2626" : "#15803d" }}
        >
          {toast.msg}
        </div>
      )}

      {confirmDialog && (
        <div className="adm-overlay">
          <div className="adm-modal">
            <p>{confirmDialog.msg}</p>
            <div className="adm-modal-actions">
              <button
                className="adm-modal-btn adm-modal-cancel"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                className="adm-modal-btn adm-modal-delete"
                onClick={confirmDialog.onConfirm}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-page">
        {/* Header */}
        <header className="adm-header">
          <h1 className="adm-header-title">Admin Panel</h1>
          <div className="adm-header-right">
            <span className="adm-header-user">
              {currentUser?.username ?? ""}
            </span>
            <button
              className="adm-back-btn"
              onClick={() => navigate("/")}
            >
              ← Back to App
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="adm-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              className={`adm-tab${section === s.key ? " active" : ""}`}
              onClick={() => setSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="adm-content">
          {loading ? (
            <div className="adm-card">
              <p className="adm-empty">Loading…</p>
            </div>
          ) : (
            sectionRenderers[section]()
          )}
        </div>
      </div>
    </>
  );
}
