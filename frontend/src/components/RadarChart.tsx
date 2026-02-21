import React, { useMemo } from "react";
import Plot from "react-plotly.js";
import { EXPERIENCE_DIMS } from "../constants";
import type { ExperienceDim } from "../constants";

interface RadarSeries {
  name: string;
  values: number[];
  opacity?: number;
}

interface RadarChartProps {
  series: RadarSeries[];
  labels: string[];
  height?: number;
  margin?: { l: number; r: number; t: number; b: number };
}

const defaultLabels = EXPERIENCE_DIMS.map(
  (d) =>
    ({
      academic_intensity: "Academic Intensity",
      social_life: "Social Life",
      inclusivity: "Inclusivity",
      career_support: "Career Support",
      collaboration_vs_competition: "Collaboration vs Competition",
      mental_health_culture: "Mental Health Culture",
      campus_safety: "Campus Safety",
      overall_satisfaction: "Overall Satisfaction",
    })[d as ExperienceDim]
);

export function RadarChart({
  series,
  labels = defaultLabels,
  height = 400,
  margin = { l: 40, r: 40, t: 40, b: 40 },
}: RadarChartProps) {
  const labelsClosed = useMemo(() => [...labels, labels[0]], [labels]);

  const data = useMemo(
    () =>
      series.map((s) => {
        const valsClosed = [...s.values, s.values[0]];
        return {
          type: "scatterpolar",
          r: valsClosed,
          theta: labelsClosed,
          fill: "toself",
          name: s.name,
          opacity: s.opacity ?? 0.6,
        };
      }),
    [series, labelsClosed]
  );

  const layout = useMemo(
    () => ({
      polar: {
        radialaxis: { visible: true, range: [0, 1] },
      },
      showlegend: true,
      margin,
      height,
      autosize: true,
    }),
    [height, margin]
  );

  return (
    <Plot
      data={data}
      layout={layout}
      useResizeHandler
      style={{ width: "100%", minHeight: height }}
      config={{ responsive: true }}
    />
  );
}
