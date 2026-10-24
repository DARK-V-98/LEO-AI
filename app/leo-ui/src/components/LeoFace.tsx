"use client";

import { useEffect, useState } from "react";

export type LeoMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "alert";

const MOOD_COLOR: Record<LeoMood, string> = {
  idle: "var(--accent-cyan)",
  listening: "var(--accent-magenta)",
  thinking: "var(--accent-violet)",
  speaking: "var(--accent-cyan)",
  happy: "var(--accent-green)",
  alert: "var(--accent-amber)",
};

const MOOD_LABEL: Record<LeoMood, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  happy: "All good",
  alert: "Needs attention",
};

export default function LeoFace({
  mood = "idle",
  size = 180,
  showLabel = true,
}: {
  mood?: LeoMood;
  size?: number;
  showLabel?: boolean;
}) {
  const [blink, setBlink] = useState(false);
  const [mouthTick, setMouthTick] = useState(0);
  const color = MOOD_COLOR[mood];

  // Natural, irregular blinking.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timer = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 130);
          scheduleBlink();
        },
        2200 + Math.random() * 2600
      );
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  // Mouth animates while "speaking".
  useEffect(() => {
    if (mood !== "speaking") return;
    const id = setInterval(() => setMouthTick((t) => t + 1), 140);
    return () => clearInterval(id);
  }, [mood]);

  const eyeH = blink ? 1.5 : mood === "listening" ? 15 : mood === "alert" ? 9 : 12;
  const eyeY = 76 - eyeH / 2;

  const browTilt =
    mood === "alert" ? 8 : mood === "thinking" ? 4 : mood === "happy" ? -4 : 0;

  const mouthPath = (() => {
    switch (mood) {
      case "happy":
        return "M 68 118 Q 100 142 132 118";
      case "alert":
        return "M 72 124 Q 100 112 128 124";
      case "thinking":
        return "M 74 120 Q 100 120 126 120";
      case "speaking": {
        const openness = 6 + (mouthTick % 3) * 6;
        return `M 78 118 Q 100 ${118 + openness} 122 118 Q 100 ${118 - openness / 2} 78 118`;
      }
      case "listening":
        return "M 72 118 Q 100 130 128 118";
      default:
        return "M 74 119 Q 100 126 126 119";
    }
  })();

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        <span
          className="pulse-ring absolute inset-0 rounded-full"
          style={{ border: `1px solid ${color}` }}
        />
        <div
          className="orb-breathe relative flex items-center justify-center rounded-full"
          style={{
            width: size,
            height: size,
            background:
              "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.06), rgba(8,12,22,0.9) 70%)",
            boxShadow: `0 0 ${size * 0.5}px -10px ${color}, inset 0 0 40px rgba(0,0,0,0.4)`,
            border: `1px solid ${color}55`,
          }}
        >
          <svg width="72%" height="72%" viewBox="0 0 200 200">
            {/* eyebrows */}
            <line
              x1="55"
              y1={60 - browTilt}
              x2="80"
              y2={60 + browTilt}
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              style={{ transition: "all 0.25s ease" }}
            />
            <line
              x1="120"
              y1={60 + browTilt}
              x2="145"
              y2={60 - browTilt}
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              style={{ transition: "all 0.25s ease" }}
            />

            {/* eyes */}
            <rect
              x={58}
              y={eyeY}
              width={22}
              height={eyeH}
              rx={8}
              fill={color}
              style={{ transition: "all 0.12s ease" }}
            />
            <rect
              x={120}
              y={eyeY}
              width={22}
              height={eyeH}
              rx={8}
              fill={color}
              style={{ transition: "all 0.12s ease" }}
            />

            {/* mouth */}
            <path
              d={mouthPath}
              stroke={color}
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              style={{ transition: "d 0.15s ease" }}
            />
          </svg>
        </div>
      </div>

      {showLabel ? (
        <span
          className="font-mono text-[11px] tracking-wide"
          style={{ color }}
        >
          {MOOD_LABEL[mood]}
        </span>
      ) : null}
    </div>
  );
}
