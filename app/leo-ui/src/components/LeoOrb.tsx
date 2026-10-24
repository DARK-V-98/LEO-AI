"use client";

import { useEffect, useRef } from "react";

export type LeoMood =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "happy"
  | "alert"
  | "sad"
  | "confused"
  | "angry";

const MOOD_RGB: Record<LeoMood, [number, number, number]> = {
  idle: [0, 229, 255],
  listening: [255, 47, 176],
  thinking: [139, 92, 246],
  speaking: [0, 229, 255],
  happy: [57, 255, 156],
  alert: [255, 176, 32],
  sad: [77, 140, 255],
  confused: [217, 165, 44],
  angry: [255, 59, 48],
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

/** How far the arms sit (base swing angle from vertical, in radians) and how
 * much they sway/twitch per mood — this is what makes each emotion legible
 * even at a glance, before you read the label underneath. */
const ARM_MOOD: Record<LeoMood, { lift: number; sway: number; speed: number; jitter: number }> = {
  idle: { lift: 0.08, sway: 0.12, speed: 0.6, jitter: 0 },
  listening: { lift: 0.25, sway: 0.18, speed: 1.1, jitter: 0.02 },
  thinking: { lift: 0.35, sway: 0.08, speed: 0.8, jitter: 0.04 },
  speaking: { lift: 0.4, sway: 0.32, speed: 1.6, jitter: 0.03 },
  happy: { lift: 0.75, sway: 0.4, speed: 2.2, jitter: 0 },
  alert: { lift: 0.5, sway: 0.15, speed: 2.4, jitter: 0.08 },
  sad: { lift: -0.55, sway: 0.05, speed: 0.3, jitter: 0 },
  confused: { lift: 0.15, sway: 0.5, speed: 2.8, jitter: 0.12 },
  angry: { lift: -0.1, sway: 0.1, speed: 3.4, jitter: 0.18 },
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
  freeRoam = false,
}: {
  mood?: LeoMood;
  size?: number;
  showLabel?: boolean;
  /** Extra HUD rings + ticks, for the big hero presentation. */
  hud?: boolean;
  /** Let him drift around his containing element instead of sitting still —
   * the container must be `position: relative` (or similar) with real size. */
  freeRoam?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointsRef = useRef<[number, number, number][]>([]);
  const dustRef = useRef<Dust[]>([]);
  const codeRef = useRef<CodeBit[]>([]);
  const rotRef = useRef({ y: 0, x: 0.35 });
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const roamRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, ready: false });

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

      // free-roam drift — a gentle random walk across the containing
      // element, bounced off its edges, so LEO isn't pinned to one spot
      if (freeRoam && wrapRef.current) {
        const parent = wrapRef.current.parentElement;
        if (parent) {
          const maxX = Math.max(0, parent.clientWidth - size);
          const maxY = Math.max(0, parent.clientHeight - size);
          const p = roamRef.current;
          if (!p.ready) {
            p.x = maxX / 2;
            p.y = maxY / 2;
            p.vx = (Math.random() - 0.5) * 0.3;
            p.vy = (Math.random() - 0.5) * 0.3;
            p.ready = true;
          }
          const roamSpeed =
            currentMood === "angry" ? 1 : currentMood === "sad" ? 0.3 : 0.55;
          p.vx += (Math.random() - 0.5) * 0.03 * roamSpeed;
          p.vy += (Math.random() - 0.5) * 0.03 * roamSpeed;
          const maxSpeed = 0.5 * roamSpeed;
          p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
          p.vy = Math.max(-maxSpeed, Math.min(maxSpeed, p.vy));
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) {
            p.x = 0;
            p.vx = Math.abs(p.vx);
          }
          if (p.x > maxX) {
            p.x = maxX;
            p.vx = -Math.abs(p.vx);
          }
          if (p.y < 0) {
            p.y = 0;
            p.vy = Math.abs(p.vy);
          }
          if (p.y > maxY) {
            p.y = maxY;
            p.vy = -Math.abs(p.vy);
          }
          wrapRef.current.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        }
      }

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

      // arms — two limbs that gesture according to mood (raised + waving
      // when happy, drooping when sad, sharp and twitchy when angry, etc.)
      const armCfg = ARM_MOOD[currentMood];
      const sway = Math.sin(t * armCfg.speed) * armCfg.sway;
      const jitter = armCfg.jitter
        ? (Math.sin(t * 19 + 3) + Math.sin(t * 27)) * armCfg.jitter
        : 0;
      for (const side of [-1, 1] as const) {
        const shoulderAngle = side * (Math.PI / 2 - 0.15);
        const sx = cx + Math.cos(shoulderAngle) * R * 0.92;
        const sy = cy + Math.sin(shoulderAngle) * R * 0.55 + R * 0.05;
        const reach = R * (1.3 + armCfg.lift * 0.35);
        const armAngle =
          side * (Math.PI / 2 + 0.3 + armCfg.lift) + sway * side + jitter;
        const elbowX = sx + Math.cos(armAngle) * reach * 0.55;
        const elbowY = sy + Math.sin(armAngle) * reach * 0.55 + R * 0.25;
        const handAngle =
          armAngle + Math.sin(t * armCfg.speed * 1.3 + side) * (0.2 + armCfg.sway * 0.5);
        const handX = elbowX + Math.cos(handAngle) * reach * 0.55;
        const handY = elbowY + Math.sin(handAngle) * reach * 0.55;

        ctx!.beginPath();
        ctx!.moveTo(sx, sy);
        ctx!.quadraticCurveTo(elbowX, elbowY, handX, handY);
        ctx!.strokeStyle = `rgba(${r},${g},${b},0.5)`;
        ctx!.lineWidth = Math.max(1.2, size * 0.011);
        ctx!.lineCap = "round";
        ctx!.stroke();

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r},${g},${b},0.9)`;
        ctx!.arc(handX, handY, Math.max(1.6, size * 0.017), 0, Math.PI * 2);
        ctx!.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, freeRoam]);

  const [r, g, b] = MOOD_RGB[mood];
  const rgb = `${r},${g},${b}`;

  return (
    <div
      ref={wrapRef}
      className={
        freeRoam
          ? "absolute left-0 top-0 flex flex-col items-center gap-3"
          : "flex flex-col items-center gap-3"
      }
      style={freeRoam ? { willChange: "transform", transition: "filter 0.6s ease" } : undefined}
    >
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
