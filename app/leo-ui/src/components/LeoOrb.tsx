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

type Dust = { angle: number; radius: number; speed: number; phase: number };

function makeDust(count: number): Dust[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 1.3 + Math.random() * 0.9,
    speed: (Math.random() - 0.5) * 0.012,
    phase: Math.random() * Math.PI * 2,
  }));
}

// A halo of orbiting glyphs around the sphere — the "codes" half of
// "codes and dots", meant to read as a higher-order entity built out of
// live data rather than a simple glowing ball.
type CodeBit = { angle: number; radius: number; speed: number; phase: number; char: string };
const GLYPH_SET = "0101010101λΣΔ#%?".split("");

function makeCodeRing(count: number): CodeBit[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: 1.55 + Math.random() * 0.55,
    speed: (Math.random() * 0.006 + 0.0015) * (Math.random() < 0.5 ? -1 : 1),
    phase: Math.random() * Math.PI * 2,
    char: GLYPH_SET[Math.floor(Math.random() * GLYPH_SET.length)],
  }));
}

export default function LeoOrb({
  mood = "idle",
  size = 180,
  showLabel = false,
  hud = false,
}: {
  mood?: LeoMood;
  size?: number;
  showLabel?: boolean;
  /** Extra HUD rings + ticks, for the big hero presentation. */
  hud?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<[number, number, number][]>([]);
  const dustRef = useRef<Dust[]>([]);
  const codeRef = useRef<CodeBit[]>([]);
  const rotRef = useRef({ y: 0, x: 0.35 });
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const density = Math.max(320, Math.round(size * 3.4));
    pointsRef.current = fibonacciSphere(density);
    dustRef.current = makeDust(Math.max(24, Math.round(size / 6)));
    codeRef.current = makeCodeRing(Math.max(14, Math.round(size / 10)));
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
      const R = size * 0.34;

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
          ? 0.09
          : currentMood === "thinking"
            ? 0.035
            : currentMood === "listening"
              ? 0.055
              : 0.015;

      ctx!.clearRect(0, 0, size, size);

      // drifting dust ring behind the sphere
      for (const d of dustRef.current) {
        d.angle += d.speed;
        const twinkle = 0.25 + Math.abs(Math.sin(t * 1.4 + d.phase)) * 0.55;
        const px = cx + Math.cos(d.angle) * R * d.radius;
        const py = cy + Math.sin(d.angle) * R * d.radius * 0.72;
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r},${g},${b},${twinkle.toFixed(3)})`;
        ctx!.arc(px, py, 1 + twinkle, 0, Math.PI * 2);
        ctx!.fill();
      }

      // orbiting glyph halo — the "codes" layer, drawn beyond the dust ring
      // so the entity reads as built out of live data, not just a glowing ball
      ctx!.font = `${Math.max(9, size * 0.055)}px "Berkeley Mono", "JetBrains Mono", monospace`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      for (const c of codeRef.current) {
        c.angle += c.speed;
        if (Math.random() < 0.01) {
          c.char = GLYPH_SET[Math.floor(Math.random() * GLYPH_SET.length)];
        }
        const twinkle = 0.2 + Math.abs(Math.sin(t * 1.1 + c.phase)) * 0.65;
        const px = cx + Math.cos(c.angle) * R * c.radius;
        const py = cy + Math.sin(c.angle) * R * c.radius * 0.72;
        ctx!.fillStyle = `rgba(${r},${g},${b},${twinkle.toFixed(3)})`;
        ctx!.fillText(c.char, px, py);
      }

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
        return [x1 * wobble, y1 * wobble, z2, i] as [number, number, number, number];
      });

      projected.sort((a, b2) => a[2] - b2[2]);

      for (const [x, y, z, i] of projected) {
        const depth = (z + 1) / 2;
        const px = cx + x * R;
        const py = cy + y * R;
        // bright "energy seam" bands sweep across a few latitude lines
        const seam = Math.sin(i * 0.17 + t * 1.6) > 0.965;
        const alpha = (seam ? 0.55 : 0.1) + depth * (seam ? 0.45 : 0.72);
        const radius = (seam ? 1.1 : 0.5) + depth * (seam ? 2.1 : 1.6);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r},${g},${b},${Math.min(alpha, 1).toFixed(3)})`;
        ctx!.arc(px, py, radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      glow.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
      glow.addColorStop(0.6, `rgba(${r},${g},${b},0.05)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx!.fill();

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const [r, g, b] = MOOD_RGB[mood];
  const rgb = `${r},${g},${b}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{ width: size, height: size }}
      >
        {hud ? (
          <>
            <svg
              className="absolute"
              style={{
                width: size * 1.32,
                height: size * 1.32,
                animation: "spin 40s linear infinite",
              }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke={`rgba(${rgb},0.25)`}
                strokeWidth="0.4"
                strokeDasharray="1 4"
              />
            </svg>
            <svg
              className="absolute"
              style={{
                width: size * 1.18,
                height: size * 1.18,
                animation: "spin-reverse 26s linear infinite",
              }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={`rgba(${rgb},0.4)`}
                strokeWidth="0.3"
                strokeDasharray="12 3 1 3"
              />
            </svg>
          </>
        ) : null}

        <span
          className="pulse-ring absolute inset-0 rounded-full"
          style={{ border: `1px solid rgba(${rgb},0.6)` }}
        />
        <canvas
          ref={canvasRef}
          style={{
            width: size,
            height: size,
            filter: `drop-shadow(0 0 ${size * 0.22}px rgba(${rgb},0.6))`,
          }}
        />
      </div>
      {showLabel ? (
        <span
          className="font-mono text-[11px] tracking-wide"
          style={{ color: `rgb(${rgb})` }}
        >
          {MOOD_LABEL[mood]}
        </span>
      ) : null}
    </div>
  );
}
