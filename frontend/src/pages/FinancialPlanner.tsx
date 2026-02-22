import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getCollegeDetail,
  postFinancialPlan,
  postAlternatives,
  postBudgetTracker,
  postPredict,
  saveCollege,
  savePlan,
} from "../api";
import type { CollegeListItem, CollegeDetail, CollegePrediction } from "../types";
import type { FinancialPlan, AlternativeRow, BudgetTrackerResult } from "../types";
import { BarChart } from "../components/BarChart";
import { CollegeDropdown } from "../components/CollegeDropdown";
import { useAuth } from "../contexts/AuthContext";
import "./FinancialPlanner.css";

const INFLATION_RATE = 0.04;

function loanPayment(principal: number, annualRate: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

const CONTROL_LABELS: Record<number, string> = { 1: "Public", 2: "Private Non-Profit", 3: "Private For-Profit" };

export function FinancialPlanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialUnitid = searchParams.get("unitid");

  const [selected, setSelected] = useState<CollegeListItem | null>(null);
  const [detail, setDetail] = useState<CollegeDetail | null>(null);
  const [prediction, setPrediction] = useState<CollegePrediction | null>(null);
  const [inState, setInState] = useState(true);
  const [onCampus, setOnCampus] = useState(true);
  const [degreeYears, setDegreeYears] = useState(4);
  const [budgetPerSem, setBudgetPerSem] = useState(15000);
  const [totalSavings, setTotalSavings] = useState(50000);
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRow[]>([]);
  const [trackSemesters, setTrackSemesters] = useState(0);
  const [trackSpent, setTrackSpent] = useState(0);
  const [tracker, setTracker] = useState<BudgetTrackerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [collegeSaved, setCollegeSaved] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);
  const [loanAmount, setLoanAmount] = useState(30000);
  const [loanRate, setLoanRate] = useState(5.5);
  const [loanTerm, setLoanTerm] = useState(10);

  useEffect(() => {
    if (initialUnitid) {
      const uid = Number(initialUnitid);
      getCollegeDetail(uid)
        .then((c) => {
          setSelected({
            UNITID: c.UNITID,
            INSTNM: c.INSTNM,
            CITY: c.CITY as string,
            STABBR: c.STABBR as string,
          });
          setDetail(c);
        })
        .catch(() => {});
    }
  }, [initialUnitid]);

  useEffect(() => {
    if (!selected) { setDetail(null); setPrediction(null); return; }
    setCollegeSaved(false);
    setPlanSaved(false);
    getCollegeDetail(selected.UNITID)
      .then(setDetail)
      .catch(() => setDetail(null));

    const profile: Record<string, unknown> = {};
    if (user?.gpa) profile.gpa = user.gpa;
    if (user?.sat) profile.sat = user.sat;
    if (user?.intended_major) profile.major = user.intended_major;
    if (user?.preferred_state) profile.location = user.preferred_state;

    postPredict(profile, [selected.UNITID])
      .then((r) => setPrediction(r.predictions[0] ?? null))
      .catch(() => setPrediction(null));
  }, [selected?.UNITID]);

  const unitid = selected?.UNITID ?? null;

  const handleCalculate = async () => {
    if (unitid == null) return;
    setError(null);
    setPlan(null);
    setAlternatives([]);
    setLoading(true);
    try {
      const result = await postFinancialPlan({
        unitid,
        budget_per_semester: budgetPerSem,
        total_savings: totalSavings,
        in_state: inState,
        on_campus: onCampus,
        degree_years: degreeYears,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setPlan(result);
        if (result.remaining_to_fund > 0) {
          setLoanAmount(Math.round(result.remaining_to_fund / 1000) * 1000);
        }
        if (!result.can_graduate_on_time) {
          const alts = await postAlternatives({
            budget_per_semester: budgetPerSem,
            in_state: inState,
            limit: 5,
          });
          setAlternatives(alts ?? []);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackBudget = async () => {
    if (unitid == null || !plan?.semester_total) return;
    const totalSems = degreeYears * 2;
    const totalCost = plan.semester_total * totalSems;
    const res = await postBudgetTracker({
      total_cost: totalCost,
      semesters_completed: trackSemesters,
      total_semesters: totalSems,
      amount_spent: trackSpent,
    });
    setTracker(res);
  };

  const costItems =
    plan && !plan.error
      ? { Tuition: plan.tuition, Housing: plan.housing, Books: plan.books, Other: plan.other }
      : null;
  const validCosts =
    costItems &&
    (Object.entries(costItems).filter(([, v]) => v != null && !Number.isNaN(v)) as [string, number][]);
  const costKeys = validCosts?.map(([k]) => k) ?? [];
  const costVals = validCosts?.map(([, v]) => v) ?? [];

  const roi = useMemo(() => {
    if (!plan || !detail) return null;
    const earnings = Number(detail.MD_EARN_WNE_P10);
    if (!earnings || plan.total_cost <= 0) return null;
    const tenYrEarnings = earnings * 10;
    const ratio = tenYrEarnings / plan.total_cost;
    return { ratio: ratio.toFixed(1), earnings, tenYrEarnings };
  }, [plan, detail]);

  const projection = useMemo(() => {
    if (!plan?.semester_total) return null;
    const years: { year: number; annual: number; cumulative: number }[] = [];
    let cum = 0;
    for (let i = 0; i < degreeYears; i++) {
      const annual = (plan.semester_total ?? 0) * 2 * Math.pow(1 + INFLATION_RATE, i);
      cum += annual;
      years.push({ year: i + 1, annual, cumulative: cum });
    }
    return years;
  }, [plan, degreeYears]);

  const monthlyPayment = useMemo(
    () => loanPayment(loanAmount, loanRate / 100, loanTerm),
    [loanAmount, loanRate, loanTerm]
  );

  const debtToIncome = useMemo(() => {
    if (!detail) return null;
    const earnings = Number(detail.MD_EARN_WNE_P10);
    if (!earnings) return null;
    return (monthlyPayment * 12) / earnings;
  }, [monthlyPayment, detail]);

  const admBadge = prediction?.admission;

  return (
    <div className="fp-scroll">
      <div className="fp-card">
        <h1 className="fp-title">Financial Planner</h1>
        <p className="fp-subtitle">
          Plan your college finances — see costs, ROI, loan repayment, and find
          alternatives.
        </p>

        {/* ── College selector ──────────────────────────────────── */}
        <div className="fp-form-row">
          <div className="fp-field" style={{ flex: 1 }}>
            <span className="fp-field-label">Select a college</span>
            <CollegeDropdown value={selected} onSelect={setSelected} />
          </div>
        </div>

        {/* ── College Profile Card (#4) ────────────────────────── */}
        {detail && (
          <>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <button
                type="button"
                className={`fp-btn-secondary${collegeSaved ? " fp-success" : ""}`}
                style={{ fontSize: "0.85rem" }}
                onClick={async () => {
                  if (collegeSaved || !selected) return;
                  try { await saveCollege(selected.UNITID, "target"); setCollegeSaved(true); } catch {}
                }}
              >
                {collegeSaved ? "❤️ Saved" : "🤍 Save College"}
              </button>
            </div>
            <div className="fp-profile-card">
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Admission Rate</div>
                <div className="fp-profile-stat-val">
                  {detail.ADM_RATE != null ? `${(Number(detail.ADM_RATE) * 100).toFixed(0)}%` : "N/A"}
                </div>
              </div>
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Grad Rate</div>
                <div className="fp-profile-stat-val">
                  {detail.C150_4 != null ? `${(Number(detail.C150_4) * 100).toFixed(0)}%` : "N/A"}
                </div>
              </div>
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Median Earnings</div>
                <div className="fp-profile-stat-val">
                  {detail.MD_EARN_WNE_P10 != null ? `$${Number(detail.MD_EARN_WNE_P10).toLocaleString()}` : "N/A"}
                </div>
              </div>
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Pell Grant %</div>
                <div className="fp-profile-stat-val">
                  {detail.PCTPELL != null ? `${(Number(detail.PCTPELL) * 100).toFixed(0)}%` : "N/A"}
                </div>
              </div>
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Student:Faculty</div>
                <div className="fp-profile-stat-val">
                  {detail.STUFACR != null ? `${Number(detail.STUFACR)}:1` : "N/A"}
                </div>
              </div>
              <div className="fp-profile-stat">
                <div className="fp-profile-stat-label">Type</div>
                <div className="fp-profile-stat-val">
                  {CONTROL_LABELS[Number(detail.CONTROL)] ?? "N/A"}
                </div>
              </div>
            </div>

            {/* ── Admission Probability (#11) ────────────────────── */}
            {admBadge && admBadge.chance != null && (
              <div
                className={`fp-admission-badge fp-admission-badge--${admBadge.category.toLowerCase()}`}
              >
                {admBadge.category} — {(admBadge.chance * 100).toFixed(0)}% estimated
                admission
              </div>
            )}
          </>
        )}

        {unitid != null && (
          <>
            <div className="fp-toggles">
              <label className="fp-toggle">
                <input type="checkbox" checked={inState} onChange={(e) => setInState(e.target.checked)} />
                In-state student
              </label>
              <label className="fp-toggle">
                <input type="checkbox" checked={onCampus} onChange={(e) => setOnCampus(e.target.checked)} />
                Living on campus
              </label>
              <div className="fp-field" style={{ minWidth: 140, flex: "none" }}>
                <span className="fp-field-label">Degree length</span>
                <select value={degreeYears} onChange={(e) => setDegreeYears(Number(e.target.value))}>
                  <option value={2}>2 years</option>
                  <option value={4}>4 years</option>
                  <option value={6}>6 years</option>
                </select>
              </div>
            </div>

            <div className="fp-form-row">
              <div className="fp-field">
                <span className="fp-field-label">Budget per semester ($)</span>
                <input type="number" min={0} step={1000} value={budgetPerSem} onChange={(e) => setBudgetPerSem(Number(e.target.value))} />
              </div>
              <div className="fp-field">
                <span className="fp-field-label">Total savings ($)</span>
                <input type="number" min={0} step={5000} value={totalSavings} onChange={(e) => setTotalSavings(Number(e.target.value))} />
              </div>
            </div>

            <button type="button" className="fp-btn-primary" onClick={handleCalculate} disabled={loading}>
              {loading ? "Calculating…" : "Calculate Plan"}
            </button>
          </>
        )}

        {error && <div className="fp-error">{error}</div>}

        {/* ── Results ───────────────────────────────────────────── */}
        {plan && !plan.error && (
          <div className="fp-section">
            <h2 className="fp-section-title">Cost Breakdown — {plan.college_name}</h2>

            {costKeys.length > 0 && (
              <div className="fp-chart-wrap">
                <BarChart x={costKeys} y={costVals} height={350} />
              </div>
            )}

            <div className="fp-metrics">
              <div className="fp-metric">
                <span className="fp-metric-label">Semester Cost</span>
                <span className="fp-metric-value">${(plan.semester_total ?? 0).toLocaleString()}</span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric-label">Total to Graduate</span>
                <span className="fp-metric-value">${plan.total_cost.toLocaleString()}</span>
              </div>
              <div className="fp-metric">
                <span className="fp-metric-label">Your Savings</span>
                <span className="fp-metric-value">${plan.total_savings.toLocaleString()}</span>
              </div>
              <div className={`fp-metric ${plan.remaining_to_fund > 0 ? "fp-metric--warning" : "fp-metric--success"}`}>
                <span className="fp-metric-label">{plan.remaining_to_fund > 0 ? "Still Need" : "Leftover"}</span>
                <span className="fp-metric-value">${Math.abs(plan.remaining_to_fund).toLocaleString()}</span>
              </div>
            </div>

            {plan.can_graduate_on_time ? (
              <div className="fp-success">
                You can graduate on time in {plan.degree_years} years! You'll have $
                {(plan.total_savings - plan.total_cost).toLocaleString()} left over.
              </div>
            ) : (
              <div className="fp-warning">
                Your savings cover {plan.affordable_semesters} of {plan.total_semesters} semesters.
                You'd need to save ${(plan.monthly_savings_needed ?? 0).toLocaleString()}/month
                over the next 6 months to close the gap.
              </div>
            )}

            {/* ── ROI Score (#1) ────────────────────────────────── */}
            {roi && (
              <div className="fp-roi-card">
                <div className="fp-roi-left">
                  <div className="fp-roi-title">Return on Investment</div>
                  <div className="fp-roi-value">{roi.ratio}x</div>
                  <div className="fp-roi-desc">
                    For every $1 invested, you earn ${roi.ratio} back over 10 years
                  </div>
                </div>
                <div className="fp-roi-right">
                  <div className="fp-roi-earnings">${roi.earnings.toLocaleString()}/yr</div>
                  <div className="fp-roi-label">Median earnings (10yr)</div>
                </div>
              </div>
            )}

            {/* ── 4-Year Cost Projection (#3) ──────────────────── */}
            {projection && (
              <>
                <h3 className="fp-section-title" style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>
                  Cost Projection ({INFLATION_RATE * 100}% annual increase)
                </h3>
                <div className="fp-projection-grid">
                  {projection.map((yr) => (
                    <div key={yr.year} className="fp-projection-year">
                      <div className="fp-projection-year-label">Year {yr.year}</div>
                      <div className="fp-projection-year-val">${Math.round(yr.annual).toLocaleString()}</div>
                      {yr.year > 1 && (
                        <div className="fp-projection-year-diff">
                          +${Math.round(yr.annual - projection[0]!.annual).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="fp-projection-year fp-projection-total">
                    <div className="fp-projection-year-label">Total</div>
                    <div className="fp-projection-year-val">
                      ${Math.round(projection[projection.length - 1]!.cumulative).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Loan Repayment Simulator (#2) ────────────────── */}
            <div className="fp-section">
              <h2 className="fp-section-title">Loan Repayment Simulator</h2>
              <div className="fp-loan-box">
                <div className="fp-loan-slider-row">
                  <label>Loan Amount</label>
                  <input
                    type="range" min={1000} max={200000} step={1000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                  />
                  <span className="fp-loan-val">${loanAmount.toLocaleString()}</span>
                </div>
                <div className="fp-loan-slider-row">
                  <label>Interest Rate</label>
                  <input
                    type="range" min={1} max={15} step={0.1}
                    value={loanRate}
                    onChange={(e) => setLoanRate(Number(e.target.value))}
                  />
                  <span className="fp-loan-val">{loanRate.toFixed(1)}%</span>
                </div>
                <div className="fp-loan-slider-row">
                  <label>Repayment Term</label>
                  <input
                    type="range" min={5} max={30} step={1}
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(Number(e.target.value))}
                  />
                  <span className="fp-loan-val">{loanTerm} yrs</span>
                </div>
                <div className="fp-loan-result">
                  <div className="fp-metric">
                    <span className="fp-metric-label">Monthly Payment</span>
                    <span className="fp-metric-value">${Math.round(monthlyPayment).toLocaleString()}</span>
                  </div>
                  <div className="fp-metric">
                    <span className="fp-metric-label">Total Repaid</span>
                    <span className="fp-metric-value">
                      ${Math.round(monthlyPayment * loanTerm * 12).toLocaleString()}
                    </span>
                  </div>
                  <div className="fp-metric">
                    <span className="fp-metric-label">Total Interest</span>
                    <span className="fp-metric-value">
                      ${Math.round(monthlyPayment * loanTerm * 12 - loanAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
                {debtToIncome != null && (
                  <>
                    <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "#555" }}>
                      Debt-to-income ratio:{" "}
                      <strong style={{ color: debtToIncome <= 0.1 ? "#15803d" : debtToIncome <= 0.2 ? "#b45309" : "#dc2626" }}>
                        {(debtToIncome * 100).toFixed(1)}%
                      </strong>{" "}
                      of estimated post-graduation salary
                    </div>
                    <div className="fp-loan-pct-bar">
                      <div
                        className={`fp-loan-pct-fill ${
                          debtToIncome <= 0.1
                            ? "fp-loan-pct-fill--ok"
                            : debtToIncome <= 0.2
                            ? "fp-loan-pct-fill--warn"
                            : "fp-loan-pct-fill--danger"
                        }`}
                        style={{ width: `${Math.min(debtToIncome * 100, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Save Plan Button ─────────────────────────────── */}
            <div style={{ textAlign: "center", margin: "1.25rem 0 0" }}>
              <button
                type="button"
                className={`fp-btn-primary${planSaved ? " fp-success" : ""}`}
                style={{ minWidth: 180 }}
                onClick={async () => {
                  if (planSaved || !selected) return;
                  try {
                    await savePlan({
                      unitid: selected.UNITID,
                      college_name: selected.INSTNM,
                      inputs: {
                        in_state: inState, on_campus: onCampus,
                        degree_years: degreeYears, budget_per_sem: budgetPerSem,
                        total_savings: totalSavings,
                      },
                      result: plan as unknown as Record<string, unknown>,
                    });
                    setPlanSaved(true);
                  } catch {}
                }}
              >
                {planSaved ? "✓ Plan Saved" : "Save This Plan"}
              </button>
            </div>

            {/* ── Affordable Alternatives (#5 clickable) ───────── */}
            {!plan.can_graduate_on_time && alternatives.length > 0 && (
              <>
                <h3 className="fp-section-title" style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>
                  Affordable Alternatives
                </h3>
                <div className="fp-table-wrap">
                  <table className="fp-table">
                    <thead>
                      <tr>
                        <th>College</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Est. Semester Cost</th>
                        <th>Graduation Rate</th>
                        <th>Median Earnings</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alternatives.map((row) => (
                        <tr key={row.UNITID} className="fp-alt-row">
                          <td style={{ fontWeight: 600 }}>{row.INSTNM}</td>
                          <td>{row.CITY}</td>
                          <td>{row.STABBR}</td>
                          <td>${row.est_semester_cost?.toLocaleString() ?? "—"}</td>
                          <td>{row.C150_4 != null ? `${(row.C150_4 * 100).toFixed(0)}%` : "—"}</td>
                          <td>{row.MD_EARN_WNE_P10 != null ? `$${row.MD_EARN_WNE_P10.toLocaleString()}` : "—"}</td>
                          <td>
                            <div className="fp-alt-actions">
                              <button
                                type="button"
                                className="fp-alt-link"
                                onClick={() => navigate(`/financial?unitid=${row.UNITID}`)}
                              >
                                Plan
                              </button>
                              <button
                                type="button"
                                className="fp-alt-link"
                                onClick={() => navigate(`/compare`)}
                              >
                                Compare
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Budget Tracker ────────────────────────────────────── */}
        {plan && !plan.error && (
          <div className="fp-section">
            <h2 className="fp-section-title">Budget Tracker</h2>
            <p className="fp-section-desc">Already enrolled? Track your spending against your plan.</p>
            <div className="fp-form-row">
              <div className="fp-field">
                <span className="fp-field-label">Semesters completed</span>
                <input type="number" min={0} max={12} value={trackSemesters} onChange={(e) => setTrackSemesters(Number(e.target.value))} />
              </div>
              <div className="fp-field">
                <span className="fp-field-label">Total spent so far ($)</span>
                <input type="number" min={0} step={1000} value={trackSpent} onChange={(e) => setTrackSpent(Number(e.target.value))} />
              </div>
            </div>
            <button type="button" className="fp-btn-secondary" onClick={handleTrackBudget}>Track Budget</button>
            {tracker && (
              <div className="fp-metrics">
                <div className="fp-metric">
                  <span className="fp-metric-label">Remaining</span>
                  <span className="fp-metric-value">${tracker.remaining.toLocaleString()}</span>
                </div>
                <div className="fp-metric">
                  <span className="fp-metric-label">Per Semester Left</span>
                  <span className="fp-metric-value">${tracker.per_semester_remaining.toLocaleString()}</span>
                </div>
                <div className={`fp-metric ${tracker.on_track ? "fp-metric--success" : "fp-metric--danger"}`}>
                  <span className="fp-metric-label">Status</span>
                  <span className="fp-metric-value">
                    {tracker.on_track ? "On Track" : "Over Budget"}{" "}
                    ({tracker.over_under >= 0 ? "+" : ""}${tracker.over_under.toLocaleString()})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
