"use client";

import { useEffect, useRef } from "react";

/**
 * Animated "real AI mode" backdrop: columns of falling binary/hex glyphs
 * rendered on a canvas, sitting behind a dark radial-gradient overlay so the
 * UI on top stays readable.
 */
export default function CodeRainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glyphs = "01<>/{}[]ΔΣΩλφ∞#$%*+01010101".split("");
    const fontSize = 14;
    let columns = 0;
    let drops: number[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      columns = Math.floor(width / fontSize);
      const rowCount = Math.ceil(height / fontSize);
      drops = new Array(columns)
        .fill(0)
        .map(() => Math.random() * rowCount - rowCount * 0.3);
    }

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let raf = 0;

    function draw() {
      frame++;
      if (frame % 2 === 0) {
        ctx!.fillStyle = "rgba(244, 246, 251, 0.22)";
        ctx!.fillRect(0, 0, width, height);

        ctx!.font = `${fontSize}px ui-monospace, Menlo, monospace`;

        for (let i = 0; i < columns; i++) {
          const text = glyphs[Math.floor(Math.random() * glyphs.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          const leadBoost = Math.random() > 0.94;
          ctx!.fillStyle = leadBoost
            ? "rgba(8, 100, 130, 0.5)"
            : "rgba(8, 145, 178, 0.14)";
          ctx!.fillText(text, x, y);

          if (y > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-100" />
      {/* light dark-overlay so the rain reads clearly, panels handle their own contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 65% at 50% 10%, rgba(244,246,251,0.4) 0%, rgba(244,246,251,0.75) 55%, rgba(244,246,251,0.92) 100%)",
        }}
      />
    </div>
  );
}
