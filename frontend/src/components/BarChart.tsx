import { useMemo } from "react";
import Plot from "react-plotly.js";

interface BarChartProps {
  x: string[];
  y: number[];
  title?: string;
  yAxisTitle?: string;
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ["#4C78A8", "#F58518", "#E45756", "#72B7B2"];

export function BarChart({
  x,
  y,
  yAxisTitle = "Annual Cost ($)",
  colors = DEFAULT_COLORS,
  height = 350,
}: BarChartProps) {
  const data = useMemo(
    () => [
      {
        type: "bar",
        x,
        y,
        marker: { color: colors.slice(0, x.length) },
      },
    ],
    [x, y, colors]
  );

  const layout = useMemo(
    () => ({
      yaxis: { title: yAxisTitle },
      margin: { l: 40, r: 40, t: 20, b: 40 },
      height,
      autosize: true,
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
