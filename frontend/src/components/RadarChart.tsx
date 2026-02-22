import { useMemo } from "react";
import Plot from "react-plotly.js";
import { EXPERIENCE_DIMS } from "../constants";
import type { ExperienceDim } from "../constants";

interface RadarSeries {
  name: string;
  values: number[];
  color?: string;
  opacity?: number;
}

interface RadarChartProps {
  series: RadarSeries[];
  labels?: string[];
  height?: number;
  compact?: boolean;
  margin?: { l: number; r: number; t: number; b: number };
}

const defaultLabels = EXPERIENCE_DIMS.map(
  (d) =>
    ({
      academic_intensity: "Academic",
      social_life: "Social",
      inclusivity: "Inclusivity",
      career_support: "Career",
      collaboration_vs_competition: "Collaboration",
      mental_health_culture: "Mental Health",
      campus_safety: "Safety",
      overall_satisfaction: "Satisfaction",
    })[d as ExperienceDim]
);

const COLORS = ["rgba(106,171,122,0.7)", "rgba(168,184,216,0.7)"];

export function RadarChart({
  series,
  labels = defaultLabels,
  height = 400,
  compact = false,
  margin,
}: RadarChartProps) {
  const labelsClosed = useMemo(() => [...labels, labels[0]], [labels]);

  const effectiveMargin = margin ?? (compact
    ? { l: 45, r: 45, t: 25, b: 25 }
    : { l: 40, r: 40, t: 40, b: 40 });

  const data = useMemo(
    () =>
      series.map((s, i) => {
        const valsClosed = [...s.values, s.values[0]];
        return {
          type: "scatterpolar" as const,
          r: valsClosed,
          theta: labelsClosed,
          fill: "toself" as const,
          name: s.name,
          opacity: s.opacity ?? 0.6,
          fillcolor: s.color ?? COLORS[i % COLORS.length],
          line: {
            color: s.color
              ? s.color.replace(/[\d.]+\)$/, "1)")
              : COLORS[i % COLORS.length]!.replace(/[\d.]+\)$/, "1)"),
            width: compact ? 1.5 : 2,
          },
          marker: { size: compact ? 3 : 5 },
        };
      }),
    [series, labelsClosed, compact]
  );

  const layout = useMemo(
    () => ({
      polar: {
        bgcolor: "transparent",
        radialaxis: {
          visible: true,
          range: [0, 10],
          tickfont: { size: compact ? 8 : 10, color: compact ? "rgba(255,255,255,0.4)" : "#9ca3af" },
          gridcolor: compact ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          linecolor: "transparent",
        },
        angularaxis: {
          tickfont: { size: compact ? 8 : 11, color: compact ? "rgba(255,255,255,0.65)" : "#6b7280" },
          gridcolor: compact ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          linecolor: compact ? "rgba(255,255,255,0.1)" : "#d1d5db",
        },
      },
      showlegend: !compact,
      legend: compact ? undefined : {
        font: { size: 11, color: "#6b7280" },
        orientation: "h" as const,
        y: -0.15,
        x: 0.5,
        xanchor: "center" as const,
      },
      margin: effectiveMargin,
      height,
      autosize: true,
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
    }),
    [height, effectiveMargin, compact]
  );

  return (
    <Plot
      data={data}
      layout={layout}
      useResizeHandler
      style={{ width: "100%", minHeight: height }}
      config={{ responsive: true, displayModeBar: false }}
    />
  );
}
