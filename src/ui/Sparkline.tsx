interface Point {
  date: string;
  cost: number;
}

/** Minimal 2px-line sparkline. `highlight` marks one date with a ringed dot
 * (the anomaly channel — paired elsewhere with an icon + label, never color alone). */
export default function Sparkline({
  points,
  height = 56,
  highlight,
  stroke = "var(--series-cloud)",
}: {
  points: Point[];
  height?: number;
  highlight?: string;
  stroke?: string;
}) {
  const w = 460;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.cost), 1);
  const xy = (p: Point, i: number): [number, number] => [
    pad + (i / (points.length - 1)) * (w - pad * 2),
    height - pad - (p.cost / max) * (height - pad * 2),
  ];
  const path = points
    .map((p, i) => {
      const [x, y] = xy(p, i);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const hi = highlight ? points.findIndex((p) => p.date === highlight) : -1;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img" aria-label="Daily spend trend">
      <line x1={pad} y1={height - pad} x2={w - pad} y2={height - pad} stroke="var(--baseline)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      {hi >= 0 && (
        <circle
          cx={xy(points[hi], hi)[0]}
          cy={xy(points[hi], hi)[1]}
          r={5}
          fill="var(--status-critical)"
          stroke="var(--surface)"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
