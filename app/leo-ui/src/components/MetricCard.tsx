"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export default function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: string;
  /** Signed percentage change vs the previous period, e.g. 18.6 or -34.1.
   * Omit when there's no honest historical baseline to compare against —
   * never fabricate a trend. */
  delta?: number;
  icon: LucideIcon;
  accent?: "cyan" | "violet" | "magenta" | "green" | "amber";
}) {
  const accentVar = `var(--accent-${accent})`;

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-5">
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ background: accentVar }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accentVar}1a`, color: accentVar }}
        >
          <Icon size={18} />
        </div>
      </div>

      {delta !== undefined ? (
        <span
          className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            delta >= 0 ? "bg-accent-green/10 text-accent-green" : "bg-accent-magenta/10 text-accent-magenta"
          }`}
        >
          {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      ) : null}
    </div>
  );
}
