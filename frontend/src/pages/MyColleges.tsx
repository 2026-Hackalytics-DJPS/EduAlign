import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSavedColleges,
  updateSavedCollege,
  deleteSavedCollege,
  getSavedPlans,
  deleteSavedPlan,
  getSavedComparisons,
  deleteSavedComparison,
  getMatchHistory,
} from "../api";
import type {
  SavedCollegeRow,
  SavedPlanRow,
  SavedComparisonRow,
  MatchHistoryRow,
} from "../api";
import {
  GraduationCap, BarChart3, Search, Crosshair, GitCompareArrows,
} from "lucide-react";
import "./MyColleges.css";

type Tab = "colleges" | "plans" | "history" | "comparisons";

const TIERS = ["dream", "target", "safety"] as const;
const TIER_LABELS: Record<string, string> = {
  dream: "Dream Schools",
  target: "Target Schools",
  safety: "Safety Schools",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MyColleges() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("colleges");
  const [colleges, setColleges] = useState<SavedCollegeRow[]>([]);
  const [plans, setPlans] = useState<SavedPlanRow[]>([]);
  const [comparisons, setComparisons] = useState<SavedComparisonRow[]>([]);
  const [history, setHistory] = useState<MatchHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, comp, h] = await Promise.all([
        getSavedColleges(),
        getSavedPlans(),
        getSavedComparisons(),
        getMatchHistory(),
      ]);
      setColleges(c);
      setPlans(p);
      setComparisons(comp);
      setHistory(h);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTierChange = async (unitid: number, tier: string) => {
    await updateSavedCollege(unitid, { tier });
    setColleges((prev) =>
      prev.map((c) => (c.unitid === unitid ? { ...c, tier } : c))
    );
  };

  const handleNotesBlur = async (unitid: number, notes: string) => {
    await updateSavedCollege(unitid, { notes });
    setColleges((prev) =>
      prev.map((c) => (c.unitid === unitid ? { ...c, notes } : c))
    );
  };

  const handleRemoveCollege = async (unitid: number) => {
    await deleteSavedCollege(unitid);
    setColleges((prev) => prev.filter((c) => c.unitid !== unitid));
  };

  const handleRemovePlan = async (id: number) => {
    await deleteSavedPlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRemoveComp = async (id: number) => {
    await deleteSavedComparison(id);
    setComparisons((prev) => prev.filter((c) => c.id !== id));
  };

  const renderCollegesTab = () => {
    if (colleges.length === 0) {
      return (
        <div className="my-empty">
          <div className="my-empty-icon"><GraduationCap size={28} /></div>
          <div>No saved colleges yet.</div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Heart colleges from your match results, financial planner, or comparisons to build your list.
          </div>
        </div>
      );
    }

    return (
      <div className="my-kanban">
        {TIERS.map((tier) => {
          const items = colleges.filter((c) => c.tier === tier);
          return (
            <div key={tier} className="my-kanban-col">
              <div className="my-kanban-col-title">
                <span className={`my-tier-dot my-tier-${tier}`} />
                {TIER_LABELS[tier]} ({items.length})
              </div>
              {items.map((c) => (
                <div key={c.unitid} className="my-college-card">
                  <div className="my-college-name">{c.college_name ?? `College #${c.unitid}`}</div>
                  <div className="my-college-location">
                    {[c.city, c.state].filter(Boolean).join(", ")}
                  </div>
                  <div className="my-college-stats">
                    {c.adm_rate != null && (
                      <span className="my-college-stat">
                        Adm: <strong>{(c.adm_rate * 100).toFixed(0)}%</strong>
                      </span>
                    )}
                    {c.grad_rate != null && (
                      <span className="my-college-stat">
                        Grad: <strong>{(c.grad_rate * 100).toFixed(0)}%</strong>
                      </span>
                    )}
                    {c.median_earnings != null && (
                      <span className="my-college-stat">
                        Earn: <strong>${c.median_earnings.toLocaleString()}</strong>
                      </span>
                    )}
                  </div>
                  <textarea
                    className="my-notes-input"
                    rows={2}
                    placeholder="Add notes…"
                    defaultValue={c.notes ?? ""}
                    onBlur={(e) => handleNotesBlur(c.unitid, e.target.value)}
                  />
                  <div className="my-college-actions">
                    <select
                      className="my-tier-select"
                      value={c.tier}
                      onChange={(e) => handleTierChange(c.unitid, e.target.value)}
                    >
                      <option value="dream">Dream</option>
                      <option value="target">Target</option>
                      <option value="safety">Safety</option>
                    </select>
                    <button
                      type="button"
                      className="my-college-action"
                      onClick={() => navigate(`/financial?unitid=${c.unitid}`)}
                    >
                      Plan
                    </button>
                    <button
                      type="button"
                      className="my-college-action"
                      onClick={() => navigate("/compare")}
                    >
                      Compare
                    </button>
                    <button
                      type="button"
                      className="my-college-action my-college-action--danger"
                      onClick={() => handleRemoveCollege(c.unitid)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div style={{ color: "#9ca3af", fontSize: "0.82rem", textAlign: "center", padding: "1.5rem 0" }}>
                  No {tier} schools yet
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlansTab = () => {
    if (plans.length === 0) {
      return (
        <div className="my-empty">
          <div className="my-empty-icon"><BarChart3 size={28} /></div>
          <div>No saved financial plans.</div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Run a financial plan and click "Save this plan" to keep it here.
          </div>
        </div>
      );
    }

    return plans.map((p) => {
      const result = p.result as Record<string, unknown>;
      const semCost = Number(result?.semester_total) || 0;
      const totalCost = Number(result?.total_cost) || 0;
      const canGrad = Boolean(result?.can_graduate_on_time);

      return (
        <div key={p.id} className="my-plan-card">
          <div className="my-plan-info">
            <div className="my-plan-name">{p.college_name ?? `College #${p.unitid}`}</div>
            <div className="my-plan-meta">
              Saved {fmtDate(p.created_at)} · ${semCost.toLocaleString()}/semester
            </div>
            <span className={`my-plan-status ${canGrad ? "my-plan-status--ok" : "my-plan-status--warn"}`}>
              {canGrad ? "Can Graduate On Time" : "Needs More Funding"}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="my-plan-cost">${totalCost.toLocaleString()}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>total cost</div>
            <div className="my-college-actions" style={{ marginTop: "0.4rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="my-college-action"
                onClick={() => navigate(`/financial?unitid=${p.unitid}`)}
              >
                Open
              </button>
              <button
                type="button"
                className="my-college-action my-college-action--danger"
                onClick={() => handleRemovePlan(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  const renderHistoryTab = () => {
    if (history.length === 0) {
      return (
        <div className="my-empty">
          <div className="my-empty-icon"><Search size={28} /></div>
          <div>No match searches yet.</div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Run a match search on "Find Your Match" and your history will appear here.
          </div>
        </div>
      );
    }

    return history.map((h) => {
      const meta = h.metadata ?? {};
      const college = (meta.top_college as string) ?? "Unknown";
      const score = meta.similarity_score as number | undefined;
      const usedLlm = meta.used_llm as boolean | undefined;

      return (
        <div key={h.id} className="my-match-card">
          <div className="my-match-icon"><Crosshair size={18} /></div>
          <div className="my-match-info">
            <div className="my-match-college">{college}</div>
            <div className="my-match-date">
              {fmtDate(h.created_at)}
              {usedLlm != null && (
                <span style={{ marginLeft: "0.5rem", color: usedLlm ? "#6aab7a" : "#9ca3af" }}>
                  {usedLlm ? "AI-Powered" : "Cosine"}
                </span>
              )}
            </div>
          </div>
          {score != null && (
            <div className="my-match-score">{(score * 100).toFixed(0)}%</div>
          )}
        </div>
      );
    });
  };

  const renderComparisonsTab = () => {
    if (comparisons.length === 0) {
      return (
        <div className="my-empty">
          <div className="my-empty-icon"><GitCompareArrows size={28} /></div>
          <div>No saved comparisons.</div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
            Compare colleges side-by-side and click "Save Comparison" to keep it here.
          </div>
        </div>
      );
    }

    return comparisons.map((comp) => (
      <div
        key={comp.id}
        className="my-comp-card"
        onClick={() => navigate("/compare")}
      >
        <div>
          <div className="my-comp-names">
            {(comp.college_names ?? comp.unitids.map(String)).map((name, i) => (
              <span key={i} className="my-comp-pill">{name}</span>
            ))}
          </div>
          {comp.label && (
            <div style={{ fontSize: "0.82rem", color: "#555", marginTop: "0.35rem" }}>
              {comp.label}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="my-comp-date">{fmtDate(comp.created_at)}</span>
          <button
            type="button"
            className="my-college-action my-college-action--danger"
            onClick={(e) => { e.stopPropagation(); handleRemoveComp(comp.id); }}
          >
            Delete
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div className="my-scroll">
      <div className="my-header">
        <h1 className="my-title">My Colleges</h1>
        <p className="my-subtitle">
          Your saved colleges, financial plans, comparisons, and match history — all in one place.
        </p>
      </div>

      <div className="my-tabs">
        <button
          type="button"
          className={`my-tab ${tab === "colleges" ? "my-tab--active" : ""}`}
          onClick={() => setTab("colleges")}
        >
          Saved Colleges
          {colleges.length > 0 && <span className="my-tab-count">{colleges.length}</span>}
        </button>
        <button
          type="button"
          className={`my-tab ${tab === "plans" ? "my-tab--active" : ""}`}
          onClick={() => setTab("plans")}
        >
          Financial Plans
          {plans.length > 0 && <span className="my-tab-count">{plans.length}</span>}
        </button>
        <button
          type="button"
          className={`my-tab ${tab === "comparisons" ? "my-tab--active" : ""}`}
          onClick={() => setTab("comparisons")}
        >
          Comparisons
          {comparisons.length > 0 && <span className="my-tab-count">{comparisons.length}</span>}
        </button>
        <button
          type="button"
          className={`my-tab ${tab === "history" ? "my-tab--active" : ""}`}
          onClick={() => setTab("history")}
        >
          Match History
          {history.length > 0 && <span className="my-tab-count">{history.length}</span>}
        </button>
      </div>

      <div className="my-content">
        {loading ? (
          <div className="my-empty">Loading…</div>
        ) : (
          <>
            {tab === "colleges" && renderCollegesTab()}
            {tab === "plans" && renderPlansTab()}
            {tab === "history" && renderHistoryTab()}
            {tab === "comparisons" && renderComparisonsTab()}
          </>
        )}
      </div>
    </div>
  );
}
