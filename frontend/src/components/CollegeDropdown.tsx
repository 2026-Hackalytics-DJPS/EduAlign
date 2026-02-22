import React, { useState, useEffect, useRef } from "react";
import { getColleges } from "../api";
import type { CollegeListItem } from "../types";

let _cache: CollegeListItem[] | null = null;

interface Props {
  value: CollegeListItem | null;
  onSelect: (c: CollegeListItem | null) => void;
  excludeIds?: number[];
  placeholder?: string;
}

export function CollegeDropdown({
  value,
  onSelect,
  excludeIds = [],
  placeholder = "Select a college…",
}: Props) {
  const [all, setAll] = useState<CollegeListItem[]>(_cache ?? []);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (_cache) return;
    getColleges("", "", 5000)
      .then((data) => {
        const sorted = data.sort((a, b) => a.INSTNM.localeCompare(b.INSTNM));
        _cache = sorted;
        setAll(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const excludeSet = new Set(excludeIds);
  const q = filter.toLowerCase();
  const filtered = all.filter((c) => {
    if (excludeSet.has(c.UNITID)) return false;
    if (!q) return true;
    return (
      c.INSTNM.toLowerCase().includes(q) ||
      c.CITY.toLowerCase().includes(q) ||
      c.STABBR.toLowerCase().includes(q)
    );
  });
  const visible = filtered.slice(0, 100);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          gap: "0.5rem",
        }}
      >
        {open ? (
          <input
            autoFocus
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Type to filter…"
            style={{ flex: 1, minWidth: 200 }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              padding: "0.4rem 0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              minWidth: 200,
              color: value ? undefined : "#999",
            }}
          >
            {value ? value.INSTNM : placeholder}
          </span>
        )}
        {value && (
          <button
            type="button"
            className="secondary-btn"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
              setFilter("");
            }}
          >
            &times;
          </button>
        )}
      </div>

      {open && (
        <ul
          style={{
            position: "absolute",
            zIndex: 30,
            marginTop: 4,
            width: "100%",
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            listStyle: "none",
            padding: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {all.length === 0 ? (
            <li style={{ padding: "0.75rem 1rem", color: "#999" }}>
              Loading colleges…
            </li>
          ) : visible.length === 0 ? (
            <li style={{ padding: "0.75rem 1rem", color: "#999" }}>
              No matches found
            </li>
          ) : (
            <>
              {visible.map((c) => (
                <li
                  key={c.UNITID}
                  onClick={() => {
                    onSelect(c);
                    setFilter("");
                    setOpen(false);
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.background = "#f0f4ff")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.background = "")
                  }
                >
                  {c.INSTNM}{" "}
                  <span style={{ color: "#999" }}>
                    — {c.CITY}, {c.STABBR}
                  </span>
                </li>
              ))}
              {filtered.length > 100 && (
                <li
                  style={{
                    padding: "0.5rem",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "0.8rem",
                  }}
                >
                  Showing 100 of {filtered.length} — type to narrow down
                </li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
