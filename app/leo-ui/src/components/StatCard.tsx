"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  accent = "cyan",
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  accent?: "cyan" | "violet" | "magenta" | "green" | "amber";
}) {
  const accentVar = `var(--accent-${accent})`;

  return (
    <div className="glass-panel group relative overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
        style={{ background: accentVar }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            background: `${accentVar}1a`,
            color: accentVar,
          }}
        >
          <Icon size={16} />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold text-foreground">
          {value}
        </span>
        {delta ? (
          <span
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend === "up" ? "text-accent-green" : "text-accent-magenta"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}
