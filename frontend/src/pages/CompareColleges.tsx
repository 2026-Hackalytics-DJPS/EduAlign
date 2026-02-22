import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCollegeDetail, postCompare, postPredict, saveComparison, saveCollege } from "../api";
import type {
  CollegeListItem,
  CollegeDetail,
  CostResult,
  CollegePrediction,
} from "../types";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { SvgRadar } from "../components/SvgRadar";
import { GroupedBarChart } from "../components/GroupedBarChart";
import { CollegeDropdown } from "../components/CollegeDropdown";
import { useAuth } from "../contexts/AuthContext";
import "./CompareColleges.css";

const RADAR_COLORS = [
  { fill: "rgba(106,171,122,0.25)", stroke: "#6aab7a" },
  { fill: "rgba(61,79,124,0.25)", stroke: "#3d4f7c" },
  { fill: "rgba(200,150,80,0.25)", stroke: "#c89650" },
  { fill: "rgba(168,100,180,0.22)", stroke: "#a864b4" },
];

const SHORT_LABELS: Record<string, string> = {
  academic_intensity: "Academics",
  social_life: "Social",
  inclusivity: "Inclusivity",
  career_support: "Career",
  collaboration_vs_competition: "Collab",
  mental_health_culture: "Mental Health",
  campus_safety: "Safety",
  overall_satisfaction: "Satisfaction",
};

const DEMO_COLORS = [
  { key: "UGDS_WHITE", label: "White", color: "#6b9bd2" },
  { key: "UGDS_BLACK", label: "Black", color: "#4a5080" },
  { key: "UGDS_HISP", label: "Hispanic", color: "#6aab7a" },
  { key: "UGDS_ASIAN", label: "Asian", color: "#c89650" },
];

const CONTROL_LABELS: Record<number, string> = {
  1: "Public",
  2: "Private Non-Profit",
  3: "Private For-Profit",
};

function fmtPct(v: unknown): string {
  return v != null ? `${(Number(v) * 100).toFixed(0)}%` : "N/A";
}

function fmtDollar(v: unknown): string {
  return v != null ? `$${Number(v).toLocaleString()}` : "N/A";
}

export function CompareColleges() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedColleges, setSelectedColleges] = useState<CollegeListItem[]>([]);
  const [details, setDetails] = useState<Record<number, CollegeDetail>>({});
  const [costs, setCosts] = useState<CostResult[]>([]);
  const [predictions, setPredictions] = useState<Record<number, CollegePrediction>>({});
  const [inState, setInState] = useState(true);
  const [onCampus, setOnCampus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState(15000);
  const [compSaved, setCompSaved] = useState(false);

  const selectedUnitids = useMemo(
    () => selectedColleges.map((c) => c.UNITID),
    [selectedColleges]
  );

  const addCollege = (c: CollegeListItem | null) => {
    if (!c || selectedColleges.length >= 4) return;
    setSelectedColleges((prev) => [...prev, c]);
  };

  const removeCollege = (unitid: number) => {
    setSelectedColleges((prev) => prev.filter((c) => c.UNITID !== unitid));
    setCosts([]);
    setCompSaved(false);
  };

  useEffect(() => {
    if (selectedUnitids.length < 2) {
      setCosts([]);
      return;
    }
    setLoading(true);
    setError(null);
    postCompare({ unitids: selectedUnitids, in_state: inState, on_campus: onCampus })
      .then(setCosts)
      .catch((e) => {
        setCosts([]);
        setError(e instanceof Error ? e.message : "Failed to load comparison");
      })
      .finally(() => setLoading(false));
  }, [selectedUnitids.join(","), inState, onCampus]);

  useEffect(() => {
    selectedUnitids.forEach((uid) => {
      if (details[uid] != null) return;
      getCollegeDetail(uid)
        .then((d) => setDetails((prev) => ({ ...prev, [uid]: d })))
        .catch(() => {});
    });
  }, [selectedUnitids]);

  useEffect(() => {
    if (selectedUnitids.length === 0) return;
    const missing = selectedUnitids.filter((uid) => !predictions[uid]);
    if (missing.length === 0) return;
    const profile: Record<string, unknown> = {};
    if (user?.gpa) profile.gpa = user.gpa;
    if (user?.sat) profile.sat = user.sat;
    if (user?.intended_major) profile.major = user.intended_major;
    if (user?.preferred_state) profile.location = user.preferred_state;

    postPredict(profile, missing)
      .then((r) => {
        const map: Record<number, CollegePrediction> = {};
        for (const p of r.predictions) map[p.UNITID] = p;
        setPredictions((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [selectedUnitids.join(",")]);

  const radarData = useMemo(() => {
    const series: { values: number[]; fill: string; stroke: string; name: string }[] = [];
    const labels = EXPERIENCE_DIMS.map((d) => SHORT_LABELS[d] ?? DIMENSION_LABELS[d]);
    selectedUnitids.forEach((uid, idx) => {
      const d = details[uid];
      if (!d) return;
      const vals = EXPERIENCE_DIMS.map((dim) => (Number(d[dim]) || 0) * 10);
      if (vals.every((v) => v === 0)) return;
      const col = selectedColleges.find((c) => c.UNITID === uid);
      const color = RADAR_COLORS[idx % RADAR_COLORS.length]!;
      series.push({ values: vals, fill: color.fill, stroke: color.stroke, name: col?.INSTNM ?? String(uid) });
    });
    return { series, labels };
  }, [selectedUnitids, details, selectedColleges]);

  const costCategories = ["Tuition", "Housing", "Books", "Other"];
  const groupedBarSeries =
    costs.length > 0
      ? costs.map((c) => ({
          name: c.college_name,
          values: [c.tuition ?? 0, c.housing ?? 0, c.books ?? 0, c.other ?? 0],
        }))
      : [];

  const detailRows = selectedUnitids
    .map((uid) => details[uid])
    .filter((d): d is CollegeDetail => d != null);

  const winners = useMemo(() => {
    if (detailRows.length < 2) return {};
    const w: Record<string, string> = {};
    let cheapest = { name: "", cost: Infinity };
    let bestGrad = { name: "", rate: -1 };
    let bestEarn = { name: "", earn: -1 };
    let bestAdm = { name: "", rate: -1 };

    detailRows.forEach((row, i) => {
      const name = selectedColleges[i]?.INSTNM ?? "";
      const costEntry = costs.find((c) => c.unitid === row.UNITID);
      if (costEntry?.semester_total != null && costEntry.semester_total < cheapest.cost) {
        cheapest = { name, cost: costEntry.semester_total };
      }
      const grad = Number(row.C150_4) || 0;
      if (grad > bestGrad.rate) bestGrad = { name, rate: grad };
      const earn = Number(row.MD_EARN_WNE_P10) || 0;
      if (earn > bestEarn.earn) bestEarn = { name, earn };
      const adm = Number(row.ADM_RATE) || 0;
      if (adm > bestAdm.rate) bestAdm = { name, rate: adm };
    });

    if (cheapest.name) w[cheapest.name] = (w[cheapest.name] ?? "") + "Lowest Cost, ";
    if (bestGrad.name) w[bestGrad.name] = (w[bestGrad.name] ?? "") + "Best Grad Rate, ";
    if (bestEarn.name) w[bestEarn.name] = (w[bestEarn.name] ?? "") + "Highest Earnings, ";
    if (bestAdm.name) w[bestAdm.name] = (w[bestAdm.name] ?? "") + "Easiest Admission, ";

    for (const k of Object.keys(w)) w[k] = w[k]!.replace(/, $/, "");
    return w;
  }, [detailRows, costs, selectedColleges]);

  const handleExport = useCallback(() => {
    const lines: string[] = ["College,Admission Rate,Graduation Rate,Median Earnings,Semester Cost,Annual Cost"];
    detailRows.forEach((row, i) => {
      const name = selectedColleges[i]?.INSTNM ?? "";
      const costEntry = costs.find((c) => c.unitid === row.UNITID);
      lines.push(
        `"${name}",${fmtPct(row.ADM_RATE)},${fmtPct(row.C150_4)},${fmtDollar(row.MD_EARN_WNE_P10)},${
          costEntry?.semester_total != null ? `$${costEntry.semester_total.toLocaleString()}` : "N/A"
        },${costEntry?.annual_total != null ? `$${costEntry.annual_total.toLocaleString()}` : "N/A"}`
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edualign-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [detailRows, selectedColleges, costs]);

  return (
    <div className="cc-scroll">
      <div className="cc-card">
        <h1 className="cc-title">Compare Colleges</h1>
        <p className="cc-subtitle">Select 2–4 colleges to compare side by side.</p>

        {selectedColleges.length < 4 && (
          <div className="cc-dropdown-row">
            <div className="cc-dropdown-label">Add a college</div>
            <CollegeDropdown
              value={null}
              onSelect={addCollege}
              excludeIds={selectedUnitids}
              placeholder="Search for a college to add…"
            />
          </div>
        )}

        {selectedColleges.length > 0 && (
          <div className="cc-pills">
            {selectedColleges.map((c, idx) => (
              <span
                key={c.UNITID}
                className="cc-pill"
                style={{ borderLeft: `3px solid ${RADAR_COLORS[idx % RADAR_COLORS.length]!.stroke}` }}
              >
                {c.INSTNM}
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", padding: "0 2px" }}
                  title="Save to My Colleges"
                  onClick={() => saveCollege(c.UNITID, "target").catch(() => {})}
                >
                  🤍
                </button>
                <button type="button" className="cc-pill-x" onClick={() => removeCollege(c.UNITID)}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {selectedColleges.length === 1 && (
          <p className="cc-info">Select at least 2 colleges to compare.</p>
        )}

        {selectedColleges.length >= 2 && (
          <>
            {/* ── Export + Save (#12) ───────────────────────────── */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <button type="button" className="cc-export-btn" onClick={handleExport}>
                ↓ Export CSV
              </button>
              <button
                type="button"
                className="cc-export-btn"
                style={compSaved ? { background: "#6aab7a", color: "#fff" } : {}}
                onClick={async () => {
                  if (compSaved) return;
                  const ids = selectedUnitids;
                  const names = detailRows.map((d) => d.INSTNM).join(" vs ");
                  try {
                    await saveComparison(ids, names);
                    setCompSaved(true);
                  } catch {}
                }}
              >
                {compSaved ? "✓ Saved" : "Save Comparison"}
              </button>
            </div>

            {/* ── Budget input for affordability ────────────────── */}
            <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#3d4f7c", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>
                Your semester budget ($)
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                style={{
                  width: 120, padding: "0.45rem 0.7rem", borderRadius: 10,
                  border: "1.5px solid #dde2dd", fontSize: "0.9rem", fontFamily: "inherit",
                  background: "#f8faf8",
                }}
              />
            </div>

            {/* ── Experience Radar ──────────────────────────────── */}
            <section className="cc-section">
              <h2 className="cc-section-title">Experience Profile Comparison</h2>
              {radarData.series.length > 0 ? (
                <div className="cc-radar-wrap">
                  <SvgRadar series={radarData.series} labels={radarData.labels} size={400} theme="light" />
                  <div className="cc-radar-legend">
                    {radarData.series.map((s) => (
                      <span key={s.name} className="cc-radar-legend-item">
                        <span className="cc-legend-swatch" style={{ background: s.stroke }} />
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="cc-info">Loading profile data… or none of the selected colleges have alumni experience data.</p>
              )}
            </section>

            {/* ── Financial Comparison ──────────────────────────── */}
            <section className="cc-section">
              <h2 className="cc-section-title">Financial Comparison</h2>
              <div className="cc-toggles">
                <label className="cc-toggle">
                  <input type="checkbox" checked={inState} onChange={(e) => setInState(e.target.checked)} />
                  Compare as in-state
                </label>
                <label className="cc-toggle">
                  <input type="checkbox" checked={onCampus} onChange={(e) => setOnCampus(e.target.checked)} />
                  Compare on-campus
                </label>
              </div>
              {error && <div style={{ color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error}</div>}
              {loading && <p className="cc-loading">Loading costs…</p>}
              {costs.length > 0 && (
                <>
                  <div className="cc-table-wrap">
                    <table className="cc-table">
                      <thead>
                        <tr>
                          <th>College</th>
                          <th>Tuition</th>
                          <th>Housing</th>
                          <th>Books</th>
                          <th>Other</th>
                          <th>Semester Total</th>
                          <th>Annual Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.map((c) => (
                          <tr key={c.unitid}>
                            <td style={{ fontWeight: 600 }}>{c.college_name}</td>
                            <td>{c.tuition != null ? `$${c.tuition.toLocaleString()}` : "—"}</td>
                            <td>{c.housing != null ? `$${c.housing.toLocaleString()}` : "—"}</td>
                            <td>{c.books != null ? `$${c.books.toLocaleString()}` : "—"}</td>
                            <td>{c.other != null ? `$${c.other.toLocaleString()}` : "—"}</td>
                            <td style={{ fontWeight: 600 }}>{c.semester_total != null ? `$${c.semester_total.toLocaleString()}` : "—"}</td>
                            <td style={{ fontWeight: 600 }}>{c.annual_total != null ? `$${c.annual_total.toLocaleString()}` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="cc-chart-wrap">
                    <GroupedBarChart categories={costCategories} series={groupedBarSeries} height={400} />
                  </div>
                </>
              )}
            </section>

            {/* ── Key Metrics + Quick Facts + Demographics + Admission + Winners ─ */}
            <section className="cc-section">
              <h2 className="cc-section-title">College Profiles</h2>
              <div className="cc-metric-grid">
                {detailRows.map((row, i) => {
                  const name = selectedColleges[i]?.INSTNM ?? "—";
                  const costEntry = costs.find((c) => c.unitid === row.UNITID);
                  const pred = predictions[row.UNITID];
                  const affordable =
                    costEntry?.semester_total != null
                      ? costEntry.semester_total <= budget
                        ? "affordable"
                        : costEntry.semester_total <= budget * 1.3
                        ? "stretch"
                        : "expensive"
                      : null;

                  const demoTotal =
                    DEMO_COLORS.reduce((s, d) => s + (Number((row as Record<string, unknown>)[d.key]) || 0), 0);

                  return (
                    <div key={selectedColleges[i]?.UNITID ?? i} className="cc-metric-card">
                      <h3 className="cc-metric-card-name">{name}</h3>

                      {/* Affordability badge (#6) */}
                      {affordable && (
                        <div className={`cc-afford-badge cc-afford-badge--${affordable}`}>
                          {affordable === "affordable"
                            ? "Within Budget"
                            : affordable === "stretch"
                            ? "Stretch"
                            : "Over Budget"}
                        </div>
                      )}

                      {/* Quick facts (#8) */}
                      <div className="cc-quick-facts">
                        <span className="cc-fact-pill">
                          <strong>{CONTROL_LABELS[Number(row.CONTROL)] ?? "?"}</strong>
                        </span>
                        {row.UGDS != null && (
                          <span className="cc-fact-pill">
                            <strong>{Number(row.UGDS).toLocaleString()}</strong> students
                          </span>
                        )}
                        {row.STUFACR != null && (
                          <span className="cc-fact-pill">
                            <strong>{Number(row.STUFACR)}:1</strong> ratio
                          </span>
                        )}
                        {row.SAT_AVG != null && (
                          <span className="cc-fact-pill">
                            SAT <strong>{Number(row.SAT_AVG)}</strong>
                          </span>
                        )}
                        {Number(row.HBCU) === 1 && <span className="cc-fact-pill"><strong>HBCU</strong></span>}
                        {Number(row.WOMENONLY) === 1 && <span className="cc-fact-pill"><strong>Women's College</strong></span>}
                      </div>

                      {/* Admission probability (#11) */}
                      {pred?.admission?.chance != null && (
                        <div
                          className={`cc-admission-badge cc-admission-badge--${pred.admission.category.toLowerCase()}`}
                        >
                          {pred.admission.category} — {(pred.admission.chance * 100).toFixed(0)}%
                        </div>
                      )}

                      {/* Key metrics */}
                      <div className="cc-metric-row">
                        <span className="cc-metric-key">Admission Rate</span>
                        <span className="cc-metric-val">{fmtPct(row.ADM_RATE)}</span>
                      </div>
                      <div className="cc-metric-row">
                        <span className="cc-metric-key">Graduation Rate</span>
                        <span className="cc-metric-val">{fmtPct(row.C150_4)}</span>
                      </div>
                      <div className="cc-metric-row">
                        <span className="cc-metric-key">Median Earnings (10yr)</span>
                        <span className="cc-metric-val">{fmtDollar(row.MD_EARN_WNE_P10)}</span>
                      </div>
                      <div className="cc-metric-row">
                        <span className="cc-metric-key">Median Debt</span>
                        <span className="cc-metric-val">{fmtDollar(row.DEBT_MDN)}</span>
                      </div>
                      <div className="cc-metric-row">
                        <span className="cc-metric-key">Pell Grant %</span>
                        <span className="cc-metric-val">{fmtPct(row.PCTPELL)}</span>
                      </div>

                      {/* Demographics (#7) */}
                      {demoTotal > 0 && (
                        <div className="cc-demo-bar-wrap">
                          <div className="cc-demo-bar">
                            {DEMO_COLORS.map((d) => {
                              const val = Number((row as Record<string, unknown>)[d.key]) || 0;
                              return (
                                <div
                                  key={d.key}
                                  className="cc-demo-segment"
                                  style={{ width: `${(val / demoTotal) * 100}%`, background: d.color }}
                                />
                              );
                            })}
                          </div>
                          <div className="cc-demo-legend">
                            {DEMO_COLORS.map((d) => {
                              const val = Number((row as Record<string, unknown>)[d.key]) || 0;
                              if (val === 0) return null;
                              return (
                                <span key={d.key} className="cc-demo-legend-item">
                                  <span className="cc-demo-legend-swatch" style={{ background: d.color }} />
                                  {d.label} {(val * 100).toFixed(0)}%
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Winner badges (#9) */}
                      {winners[name] && (
                        <div className="cc-winners">
                          {winners[name]!.split(", ").map((badge) => (
                            <span key={badge} className="cc-winner-badge">{badge}</span>
                          ))}
                        </div>
                      )}

                      {/* Quick action link */}
                      <div style={{ marginTop: "0.75rem" }}>
                        <button
                          type="button"
                          className="cc-export-btn"
                          style={{ fontSize: "0.78rem", padding: "0.3rem 0.8rem" }}
                          onClick={() => navigate(`/financial?unitid=${row.UNITID}`)}
                        >
                          View Financial Plan →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
