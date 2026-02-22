import React, { useState, useEffect, useMemo } from "react";
import { getCollegeDetail, postCompare } from "../api";
import type { CollegeListItem, CollegeDetail, CostResult } from "../types";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { RadarChart } from "../components/RadarChart";
import { GroupedBarChart } from "../components/GroupedBarChart";
import { CollegeDropdown } from "../components/CollegeDropdown";

export function CompareColleges() {
  const [selectedColleges, setSelectedColleges] = useState<CollegeListItem[]>(
    []
  );
  const [details, setDetails] = useState<Record<number, CollegeDetail>>({});
  const [costs, setCosts] = useState<CostResult[]>([]);
  const [inState, setInState] = useState(true);
  const [onCampus, setOnCampus] = useState(true);
  const [loading, setLoading] = useState(false);

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
  };

  useEffect(() => {
    if (selectedUnitids.length < 2) {
      setCosts([]);
      return;
    }
    setLoading(true);
    postCompare({
      unitids: selectedUnitids,
      in_state: inState,
      on_campus: onCampus,
    })
      .then(setCosts)
      .catch(() => setCosts([]))
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

  const profileData = useMemo(() => {
    const series: { name: string; values: number[] }[] = [];
    const labels = EXPERIENCE_DIMS.map((d) => DIMENSION_LABELS[d]);
    selectedUnitids.forEach((uid) => {
      const d = details[uid];
      if (!d) return;
      const vals = EXPERIENCE_DIMS.map((dim) => Number(d[dim]) || 0);
      if (vals.every((v) => v === 0)) return;
      const col = selectedColleges.find((c) => c.UNITID === uid);
      series.push({ name: col?.INSTNM ?? String(uid), values: vals });
    });
    return { series, labels };
  }, [selectedUnitids, details, selectedColleges]);

  const costCategories = ["Tuition", "Housing", "Books", "Other"];
  const groupedBarSeries =
    costs.length > 0
      ? costs.map((c) => ({
          name: c.college_name,
          values: [
            c.tuition ?? 0,
            c.housing ?? 0,
            c.books ?? 0,
            c.other ?? 0,
          ],
        }))
      : [];

  const detailRows = selectedUnitids
    .map((uid) => details[uid])
    .filter(Boolean);

  return (
    <div className="page compare-colleges">
      <h1>Compare Colleges</h1>
      <p className="subtitle">Select 2–4 colleges to compare side by side.</p>

      {selectedColleges.length < 4 && (
        <div className="form-row">
          <label style={{ flex: 1 }}>
            Add a college
            <CollegeDropdown
              value={null}
              onSelect={addCollege}
              excludeIds={selectedUnitids}
              placeholder="Search for a college to add…"
            />
          </label>
        </div>
      )}

      {selectedColleges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", margin: "1rem 0" }}>
          {selectedColleges.map((c) => (
            <span
              key={c.UNITID}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                background: "#e0e7ff",
                color: "#1e40af",
                padding: "0.25rem 0.75rem",
                borderRadius: 16,
                fontSize: "0.85rem",
              }}
            >
              {c.INSTNM}
              <button
                type="button"
                onClick={() => removeCollege(c.UNITID)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#1e40af",
                  fontWeight: 700,
                  fontSize: "1rem",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {selectedColleges.length === 1 && (
        <p className="info-msg">Select at least 2 colleges to compare.</p>
      )}

      {selectedColleges.length >= 2 && (
        <>
          <section>
            <h2>Experience Profile Comparison</h2>
            {profileData.series.length > 0 ? (
              <RadarChart
                series={profileData.series.map((s) => ({
                  name: s.name,
                  values: s.values,
                  opacity: 0.5,
                }))}
                labels={profileData.labels}
                height={500}
              />
            ) : (
              <p className="info-msg">
                Loading profile data… or none of the selected colleges have
                alumni experience data.
              </p>
            )}
          </section>

          <section>
            <h2>Financial Comparison</h2>
            <div className="toggles">
              <label>
                <input
                  type="checkbox"
                  checked={inState}
                  onChange={(e) => setInState(e.target.checked)}
                />
                Compare as in-state
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={onCampus}
                  onChange={(e) => setOnCampus(e.target.checked)}
                />
                Compare on-campus
              </label>
            </div>
            {loading && <p>Loading costs…</p>}
            {costs.length > 0 && (
              <>
                <table className="data-table">
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
                        <td>{c.college_name}</td>
                        <td>{c.tuition != null ? `$${c.tuition.toLocaleString()}` : "—"}</td>
                        <td>{c.housing != null ? `$${c.housing.toLocaleString()}` : "—"}</td>
                        <td>{c.books != null ? `$${c.books.toLocaleString()}` : "—"}</td>
                        <td>{c.other != null ? `$${c.other.toLocaleString()}` : "—"}</td>
                        <td>
                          {c.semester_total != null
                            ? `$${c.semester_total.toLocaleString()}`
                            : "—"}
                        </td>
                        <td>
                          {c.annual_total != null
                            ? `$${c.annual_total.toLocaleString()}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <GroupedBarChart
                  categories={costCategories}
                  series={groupedBarSeries}
                  height={400}
                />
              </>
            )}
          </section>

          <section>
            <h2>Key Metrics</h2>
            <div className="metrics-grid">
              {detailRows.map((row, i) => (
                <div key={selectedColleges[i]?.UNITID ?? i} className="metric-card">
                  <h3>{selectedColleges[i]?.INSTNM ?? "—"}</h3>
                  <p>
                    Admission Rate:{" "}
                    {row.ADM_RATE != null
                      ? `${(Number(row.ADM_RATE) * 100).toFixed(0)}%`
                      : "N/A"}
                  </p>
                  <p>
                    Graduation Rate:{" "}
                    {row.C150_4 != null
                      ? `${(Number(row.C150_4) * 100).toFixed(0)}%`
                      : "N/A"}
                  </p>
                  <p>
                    Median Earnings (10yr):{" "}
                    {row.MD_EARN_WNE_P10 != null
                      ? `$${Number(row.MD_EARN_WNE_P10).toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
