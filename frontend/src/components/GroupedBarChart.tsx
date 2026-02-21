import React, { useMemo } from "react";
import Plot from "react-plotly.js";

interface GroupedBarChartProps {
  categories: string[];
  series: { name: string; values: number[] }[];
  yAxisTitle?: string;
  height?: number;
}

export function GroupedBarChart({
  categories,
  series,
  yAxisTitle = "Annual Cost ($)",
  height = 400,
}: GroupedBarChartProps) {
  const data = useMemo(
    () =>
      series.map((s) => ({
        type: "bar",
        name: s.name,
        x: categories,
        y: s.values,
      })),
    [categories, series]
  );

  const layout = useMemo(
    () => ({
      barmode: "group",
      yaxis: { title: yAxisTitle },
      margin: { l: 40, r: 40, t: 20, b: 40 },
      height,
      autosize: true,
      legend: { orientation: "h" },
    }),
    [yAxisTitle, height]
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
