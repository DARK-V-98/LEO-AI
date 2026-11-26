"use client";

/** A small, dependency-free SVG area chart — straight-line segments rather
 * than a smoothed curve, but with ~30 points that reads just as cleanly
 * and keeps this page from pulling in a whole charting library for one
 * chart. Values are real daily counts; a flat empty state just means no
 * activity, not missing data. */
export default function ActivityChart({
  points,
  accent = "var(--accent-cyan)",
}: {
  points: { label: string; value: number }[];
  accent?: string;
}) {
  const width = 1000;
  const height = 280;
  const padLeft = 40;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;

  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? (width - padLeft - padRight) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + (1 - p.value / max) * (height - padTop - padBottom);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padBottom} L${coords[0].x.toFixed(1)},${height - padBottom} Z`
      : "";

  const gridLines = 4;
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + (i / gridLines) * (height - padTop - padBottom);
        const val = Math.round(max * (1 - i / gridLines));
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="var(--panel-border)"
              strokeWidth={1}
            />
            <text x={0} y={y + 3} fontSize={11} fill="var(--muted)">
              {val}
            </text>
          </g>
        );
      })}

      {areaPath ? <path d={areaPath} fill="url(#activity-fill)" /> : null}
      {linePath ? <path d={linePath} fill="none" stroke={accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" /> : null}

      {coords.map((c, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={c.x}
            y={height - 8}
            fontSize={11}
            fill="var(--muted)"
            textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
          >
            {c.label}
          </text>
        ) : null
      )}

      {coords.length > 0 ? (
        <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={accent} />
      ) : null}
    </svg>
  );
}
