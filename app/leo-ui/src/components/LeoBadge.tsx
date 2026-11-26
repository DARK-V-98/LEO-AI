"use client";

import { Bot } from "lucide-react";
import type { LeoMood } from "@/hooks/useLeoMood";

const MOOD_COLOR: Record<LeoMood, string> = {
  idle: "var(--accent-cyan)",
  listening: "var(--accent-magenta)",
  thinking: "var(--accent-violet)",
  speaking: "var(--accent-cyan)",
  happy: "var(--accent-green)",
  alert: "var(--accent-amber)",
  sad: "#2563eb",
  confused: "#b45309",
  angry: "#dc2626",
};

const MOOD_LABEL: Record<LeoMood, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  happy: "All good",
  alert: "Needs attention",
  sad: "Sad",
  confused: "Confused",
  angry: "Frustrated",
};

/** Static brand mark for LEO — a simple icon chip with a mood-colored
 * status dot, used wherever the old animated orb used to sit. Deliberately
 * plain (no canvas, no animation loop): this is chrome around a
 * professional dashboard, not the centerpiece of it. */
export default function LeoBadge({
  size = 40,
  mood = "idle",
  showLabel = false,
}: {
  size?: number;
  mood?: LeoMood;
  showLabel?: boolean;
}) {
  const color = MOOD_COLOR[mood];

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-2xl"
        style={{
          width: size,
          height: size,
          background: `${color}1f`,
          border: `1.5px solid ${color}4d`,
        }}
      >
        <Bot size={Math.round(size * 0.5)} style={{ color }} strokeWidth={1.75} />
        <span
          className="absolute rounded-full border-2 border-background"
          style={{
            background: color,
            width: Math.max(8, Math.round(size * 0.16)),
            height: Math.max(8, Math.round(size * 0.16)),
            right: -2,
            top: -2,
          }}
        />
      </div>
      {showLabel ? (
        <span className="text-xs font-medium" style={{ color }}>
          {MOOD_LABEL[mood]}
        </span>
      ) : null}
    </div>
  );
}
