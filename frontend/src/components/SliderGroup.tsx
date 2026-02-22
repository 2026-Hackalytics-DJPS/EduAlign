import React from "react";
import { EXPERIENCE_DIMS, DIMENSION_LABELS } from "../constants";
import type { Preferences } from "../types";

interface Props {
  values: Preferences;
  onChange: (v: Preferences) => void;
}

export function SliderGroup({ values, onChange }: Props) {
  return (
    <div className="sliders-grid">
      {EXPERIENCE_DIMS.map((dim) => (
        <div key={dim} className="slider-row">
          <label htmlFor={`sg-${dim}`}>{DIMENSION_LABELS[dim]}</label>
          <input
            id={`sg-${dim}`}
            type="range"
            min={1}
            max={10}
            value={values[dim]}
            onChange={(e) =>
              onChange({ ...values, [dim]: Number(e.target.value) })
            }
          />
          <span className="slider-value">{values[dim]}</span>
        </div>
      ))}
    </div>
  );
}
