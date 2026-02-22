import { useMemo } from "react";

interface Series {
  values: number[];
  fill: string;
  stroke: string;
}

interface SvgRadarProps {
  series: Series[];
  labels: string[];
  max?: number;
  size?: number;
  theme?: "dark" | "light";
}

const RING_COUNT = 5;
const LABEL_PAD = 18;

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function wrapLabel(text: string): string[] {
  if (text.length <= 10) return [text];
  const words = text.split(" ");
  if (words.length === 1) return [text];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function SvgRadar({ series, labels, max = 10, size = 280, theme = "dark" }: SvgRadarProps) {
  const isLight = theme === "light";
  const ringStroke = isLight ? "rgba(61,79,124,0.12)" : "rgba(255,255,255,0.1)";
  const spokeStroke = isLight ? "rgba(61,79,124,0.08)" : "rgba(255,255,255,0.07)";
  const labelFill = isLight ? "#4a5080" : "rgba(255,255,255,0.7)";
  const pad = 48;
  const vb = size + pad * 2;
  const cx = vb / 2;
  const cy = vb / 2;
  const outerR = size * 0.42;
  const n = labels.length;
  const angleStep = 360 / n;

  const grid = useMemo(() => {
    const rings: string[] = [];
    for (let r = 1; r <= RING_COUNT; r++) {
      const radius = (outerR * r) / RING_COUNT;
      const pts = Array.from({ length: n }, (_, i) => {
        const { x, y } = polarToXY(i * angleStep, radius, cx, cy);
        return `${x},${y}`;
      });
      rings.push(pts.join(" "));
    }
    const spokes = Array.from({ length: n }, (_, i) => {
      const { x, y } = polarToXY(i * angleStep, outerR, cx, cy);
      return { x1: cx, y1: cy, x2: x, y2: y };
    });
    return { rings, spokes };
  }, [n, angleStep, outerR, cx, cy]);

  const dataPolygons = useMemo(
    () =>
      series.map((s) => {
        const pts = s.values.map((v, i) => {
          const r = (Math.min(v, max) / max) * outerR;
          const { x, y } = polarToXY(i * angleStep, r, cx, cy);
          return `${x},${y}`;
        });
        return pts.join(" ");
      }),
    [series, max, outerR, angleStep, cx, cy]
  );

  const labelPositions = useMemo(
    () =>
      labels.map((label, i) => {
        const angle = i * angleStep;
        const { x, y } = polarToXY(angle, outerR + LABEL_PAD, cx, cy);

        let anchor: "middle" | "start" | "end" = "middle";
        let dx = 0;
        if (angle > 15 && angle < 165) {
          anchor = "start";
          dx = 3;
        } else if (angle > 195 && angle < 345) {
          anchor = "end";
          dx = -3;
        }

        let dy = 0;
        if (angle < 10 || angle > 350) dy = -4;
        if (angle > 170 && angle < 190) dy = 6;

        return { lines: wrapLabel(label), x: x + dx, y: y + dy, anchor };
      }),
    [labels, angleStep, outerR, cx, cy]
  );

  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      width="100%"
      style={{ display: "block" }}
    >
      {grid.rings.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke={ringStroke}
          strokeWidth={0.6}
        />
      ))}
      {grid.spokes.map((s, i) => (
        <line key={i} {...s} stroke={spokeStroke} strokeWidth={0.5} />
      ))}
      {dataPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill={series[i]!.fill}
          stroke={series[i]!.stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}
      {labelPositions.map((lp, i) => (
        <text
          key={i}
          x={lp.x}
          y={lp.y}
          textAnchor={lp.anchor}
          dominantBaseline="central"
          fill={labelFill}
          fontSize={9}
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight={500}
        >
          {lp.lines.map((line, li) => (
            <tspan key={li} x={lp.x} dy={li === 0 ? 0 : 12}>
              {line}
            </tspan>
          ))}
        </text>
      ))}
    </svg>
  );
}
