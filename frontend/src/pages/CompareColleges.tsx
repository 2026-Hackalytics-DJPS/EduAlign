import React, { useState, useEffect, useMemo } from "react";
import { getColleges, getCollegeDetail, postCompare } from "../api";
import type { CollegeListItem, CollegeDetail, CostResult } from "../types";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import { RadarChart } from "../components/RadarChart";
import { GroupedBarChart } from "../components/GroupedBarChart";

interface CollegeOption {
  displayName: string;
  unitid: number;
}

export function CompareColleges() {
  const [colleges, setColleges] = useState<CollegeListItem[]>([]);
  const [options, setOptions] = useState<CollegeOption[]>([]);
  const [displayToUnitid, setDisplayToUnitid] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<Record<number, CollegeDetail>>({});
  const [costs, setCosts] = useState<CostResult[]>([]);
  const [inState, setInState] = useState(true);
  const [onCampus, setOnCampus] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getColleges("", "", 3000).then((list) => {
      setColleges(list);
      const nameCounts: Record<string, number> = {};
      list.forEach((c) => {
        nameCounts[c.INSTNM] = (nameCounts[c.INSTNM] ?? 0) + 1;
      });
      const opts: CollegeOption[] = [];
      const toUnitid: Record<string, number> = {};
      list.forEach((c) => {
        const displayName =
          (nameCounts[c.INSTNM] ?? 0) > 1
            ? `${c.INSTNM} (${c.CITY}, ${c.STABBR})`
            : c.INSTNM;
        opts.push({ displayName, unitid: c.UNITID });
        toUnitid[displayName] = c.UNITID;
      });
      const unique = Array.from(
        new Map(opts.map((o) => [o.displayName, o])).values()
      ).sort((a, b) => a.displayName.localeCompare(b.displayName));
      setOptions(unique);
      setDisplayToUnitid(toUnitid);
    }).catch(() => {});
  }, []);

  const selectedUnitids = useMemo(
    () => selected.map((d) => displayToUnitid[d]).filter(Boolean),
    [selected, displayToUnitid]
  );

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
      getCollegeDetail(uid).then((d) =>
        setDetails((prev) => ({ ...prev, [uid]: d }))
      ).catch(() => {});
    });
  }, [selectedUnitids]);

  const profileData = useMemo(() => {
    const series: { name: string; values: number[] }[] = [];
    const labels = EXPERIENCE_DIMS.map((d) => DIMENSION_LABELS[d]);
    selectedUnitids.forEach((uid) => {
      const d = details[uid];
      if (!d) return;
      const vals = EXPERIENCE_DIMS.map(
        (dim) => (Number(d[dim]) as number) ?? 0
      );
      if (vals.every((v) => v === 0)) return;
      const name =
        options.find((o) => o.unitid === uid)?.displayName ?? String(uid);
      series.push({ name, values: vals });
    });
    return { series, labels };
  }, [selectedUnitids, details, options]);

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

  const compareRows = selectedUnitids
    .map((uid) => options.find((o) => o.unitid === uid))
    .filter(Boolean) as CollegeOption[];
  const detailRows = compareRows.map((r) => details[r.unitid]).filter(Boolean);

  return (
    <div className="page compare-colleges">
      <h1>Compare Colleges</h1>
      <p className="subtitle">Select 2–4 colleges to compare side by side.</p>

      <p className="info-msg">{options.length} colleges available for comparison.</p>

      <label>
        Choose colleges to compare
        <select
          multiple
          value={selected}
          onChange={(e) => {
            const next = Array.from(
              e.target.selectedOptions,
              (o) => o.value
            ).slice(0, 4);
            setSelected(next);
          }}
          size={8}
        >
          {options.map((o) => (
            <option key={o.displayName} value={o.displayName}>
              {o.displayName}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">Hold Ctrl/Cmd to select multiple (max 4).</p>

      {selected.length === 1 && (
        <p className="info-msg">Select at least 2 colleges to compare.</p>
      )}

      {selected.length >= 2 && (
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
                <div key={compareRows[i]?.unitid ?? i} className="metric-card">
                  <h3>{compareRows[i]?.displayName ?? "—"}</h3>
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
