import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getCollegeDetail, postFinancialPlan, postAlternatives, postBudgetTracker } from "../api";
import type { CollegeListItem } from "../types";
import type { FinancialPlan, AlternativeRow, BudgetTrackerResult } from "../types";
import { BarChart } from "../components/BarChart";
import { CollegeDropdown } from "../components/CollegeDropdown";

export function FinancialPlanner() {
  const [searchParams] = useSearchParams();
  const initialUnitid = searchParams.get("unitid");

  const [selected, setSelected] = useState<CollegeListItem | null>(null);
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

  useEffect(() => {
    if (initialUnitid) {
      getCollegeDetail(Number(initialUnitid))
        .then((c) =>
          setSelected({
            UNITID: c.UNITID,
            INSTNM: c.INSTNM,
            CITY: c.CITY as string,
            STABBR: c.STABBR as string,
          })
        )
        .catch(() => {});
    }
  }, [initialUnitid]);

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
      ? {
          Tuition: plan.tuition,
          Housing: plan.housing,
          Books: plan.books,
          Other: plan.other,
        }
      : null;
  const validCosts =
    costItems &&
    Object.entries(costItems).filter(
      ([, v]) => v != null && !Number.isNaN(v)
    ) as [string, number][];
  const costKeys = validCosts?.map(([k]) => k) ?? [];
  const costVals = validCosts?.map(([, v]) => v) ?? [];

  return (
    <div className="page financial-planner">
      <h1>Financial Planner</h1>
      <p className="subtitle">
        Plan your college finances — see costs, check affordability, and find alternatives.
      </p>

      <div className="form-row">
        <label style={{ flex: 1 }}>
          Select a college
          <CollegeDropdown value={selected} onSelect={setSelected} />
        </label>
      </div>

      {unitid != null && (
        <>
          <div className="toggles">
            <label>
              <input
                type="checkbox"
                checked={inState}
                onChange={(e) => setInState(e.target.checked)}
              />
              In-state student
            </label>
            <label>
              <input
                type="checkbox"
                checked={onCampus}
                onChange={(e) => setOnCampus(e.target.checked)}
              />
              Living on campus
            </label>
            <label>
              Degree length
              <select
                value={degreeYears}
                onChange={(e) => setDegreeYears(Number(e.target.value))}
              >
                <option value={2}>2 years</option>
                <option value={4}>4 years</option>
                <option value={6}>6 years</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Budget per semester ($)
              <input
                type="number"
                min={0}
                step={1000}
                value={budgetPerSem}
                onChange={(e) => setBudgetPerSem(Number(e.target.value))}
              />
            </label>
            <label>
              Total savings ($)
              <input
                type="number"
                min={0}
                step={5000}
                value={totalSavings}
                onChange={(e) => setTotalSavings(Number(e.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={handleCalculate}
            disabled={loading}
          >
            {loading ? "Calculating…" : "Calculate Plan"}
          </button>
        </>
      )}

      {error && <div className="error-banner">{error}</div>}

      {plan && !plan.error && (
        <section className="plan-results">
          <h2>Cost Breakdown — {plan.college_name}</h2>
          {costKeys.length > 0 && (
            <BarChart x={costKeys} y={costVals} height={350} />
          )}
          <div className="metrics-row">
            <div className="metric">
              <span className="metric-label">Semester Cost</span>
              <span className="metric-value">
                ${(plan.semester_total ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Total to Graduate</span>
              <span className="metric-value">
                ${plan.total_cost.toLocaleString()}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Your Savings</span>
              <span className="metric-value">
                ${plan.total_savings.toLocaleString()}
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Still Need</span>
              <span className="metric-value">
                ${plan.remaining_to_fund.toLocaleString()}
              </span>
            </div>
          </div>
          {plan.can_graduate_on_time ? (
            <p className="success-msg">
              You can graduate on time in {plan.degree_years} years! You'll have $
              {(plan.total_savings - plan.total_cost).toLocaleString()} left over.
            </p>
          ) : (
            <>
              <p className="warning-msg">
                Your savings cover {plan.affordable_semesters} of{" "}
                {plan.total_semesters} semesters. You'd need to save $
                {(plan.monthly_savings_needed ?? 0).toLocaleString()}/month over
                the next 6 months to close the gap.
              </p>
              {alternatives.length > 0 && (
                <>
                  <h3>Affordable Alternatives</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>College</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Est. Semester Cost</th>
                        <th>Graduation Rate</th>
                        <th>Median Earnings (10yr)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alternatives.map((row) => (
                        <tr key={row.UNITID}>
                          <td>{row.INSTNM}</td>
                          <td>{row.CITY}</td>
                          <td>{row.STABBR}</td>
                          <td>
                            ${row.est_semester_cost?.toLocaleString() ?? "—"}
                          </td>
                          <td>
                            {row.C150_4 != null
                              ? `${(row.C150_4 * 100).toFixed(0)}%`
                              : "—"}
                          </td>
                          <td>
                            {row.MD_EARN_WNE_P10 != null
                              ? `$${row.MD_EARN_WNE_P10.toLocaleString()}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </section>
      )}

      {plan && !plan.error && (
        <section className="budget-tracker">
          <h2>Budget Tracker</h2>
          <p>Already enrolled? Track your spending.</p>
          <div className="form-row">
            <label>
              Semesters completed
              <input
                type="number"
                min={0}
                max={12}
                value={trackSemesters}
                onChange={(e) => setTrackSemesters(Number(e.target.value))}
              />
            </label>
            <label>
              Total spent so far ($)
              <input
                type="number"
                min={0}
                step={1000}
                value={trackSpent}
                onChange={(e) => setTrackSpent(Number(e.target.value))}
              />
            </label>
          </div>
          <button type="button" className="secondary-btn" onClick={handleTrackBudget}>
            Track Budget
          </button>
          {tracker && (
            <div className="metrics-row">
              <div className="metric">
                <span className="metric-label">Remaining</span>
                <span className="metric-value">
                  ${tracker.remaining.toLocaleString()}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Per Semester Left</span>
                <span className="metric-value">
                  ${tracker.per_semester_remaining.toLocaleString()}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">Status</span>
                <span className="metric-value">
                  {tracker.on_track ? "On Track" : "Over Budget"}{" "}
                  (${tracker.over_under >= 0 ? "+" : ""}
                  {tracker.over_under.toLocaleString()})
                </span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
