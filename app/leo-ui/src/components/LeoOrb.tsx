"use client";

import { useEffect, useRef } from "react";

export type LeoMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "alert";

const MOOD_RGB: Record<LeoMood, [number, number, number]> = {
  idle: [0, 229, 255],
  listening: [255, 47, 176],
  thinking: [139, 92, 246],
  speaking: [0, 229, 255],
  happy: [57, 255, 156],
  alert: [255, 176, 32],
};

const MOOD_LABEL: Record<LeoMood, string> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking…",
  speaking: "Speaking",
  happy: "All good",
  alert: "Needs attention",
};

function fibonacciSphere(count: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

export default function LeoOrb({
  mood = "idle",
  size = 180,
  showLabel = false,
}: {
  mood?: LeoMood;
  size?: number;
  showLabel?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<[number, number, number][]>([]);
  const rotRef = useRef({ y: 0, x: 0.35 });
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const density = Math.max(260, Math.round(size * 2.6));
    pointsRef.current = fibonacciSphere(density);
  }, [size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let t = 0;

    function draw() {
      t += 0.016;
      const currentMood = moodRef.current;
      const [r, g, b] = MOOD_RGB[currentMood];
      const cx = size / 2;
      const cy = size / 2;
      const R = size * 0.37;

      const speed =
        currentMood === "speaking"
          ? 0.028
          : currentMood === "listening"
            ? 0.02
            : currentMood === "thinking"
              ? 0.016
              : 0.008;
      rotRef.current.y += speed;

      const jitterAmp =
        currentMood === "speaking"
          ? 0.085
          : currentMood === "thinking"
            ? 0.035
            : currentMood === "listening"
              ? 0.05
              : 0.015;

      ctx!.clearRect(0, 0, size, size);

      const cosY = Math.cos(rotRef.current.y);
      const sinY = Math.sin(rotRef.current.y);
      const cosX = Math.cos(rotRef.current.x);
      const sinX = Math.sin(rotRef.current.x);

      const projected = pointsRef.current.map(([x, y, z], i) => {
        const wobble = 1 + Math.sin(t * 3 + i * 0.6) * jitterAmp * 0.5;
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        return [x1 * wobble, y1 * wobble, z2] as [number, number, number];
      });

      projected.sort((a, b) => a[2] - b[2]);

      for (const [x, y, z] of projected) {
        const depth = (z + 1) / 2;
        const px = cx + x * R;
        const py = cy + y * R;
        const alpha = 0.12 + depth * 0.7;
        const radius = 0.5 + depth * 1.6;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx!.arc(px, py, radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.16)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx!.fill();

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const [r, g, b] = MOOD_RGB[mood];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        <span
          className="pulse-ring absolute inset-0 rounded-full"
          style={{ border: `1px solid rgba(${r},${g},${b},0.6)` }}
        />
        <canvas
          ref={canvasRef}
          style={{
            width: size,
            height: size,
            filter: `drop-shadow(0 0 ${size * 0.18}px rgba(${r},${g},${b},0.55))`,
          }}
        />
      </div>
      {showLabel ? (
        <span
          className="font-mono text-[11px] tracking-wide"
          style={{ color: `rgb(${r},${g},${b})` }}
        >
          {MOOD_LABEL[mood]}
        </span>
      ) : null}
    </div>
  );
}
