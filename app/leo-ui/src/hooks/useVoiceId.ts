"use client";

import { useCallback, useRef } from "react";

/** Autocorrelation pitch detector — standard, dependency-free, good enough
 * for a rough per-speaker voiceprint (not production speaker recognition). */
function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // too quiet / silence

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;

  const c = new Array(n).fill(0);
  for (let lag = 0; lag < n; lag++) {
    for (let i = 0; i < n - lag; i++) {
      c[lag] += trimmed[i] * trimmed[i + lag];
    }
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  const T0 = maxPos;
  const freq = sampleRate / T0;
  return freq > 70 && freq < 400 ? freq : null; // human voice fundamental range
}

function spectralCentroid(buf: Float32Array): number {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < buf.length; i++) {
    const mag = Math.abs(buf[i]);
    weighted += mag * i;
    total += mag;
  }
  return total > 0 ? weighted / total : 0;
}

export type VoiceCapture = { signature: [number, number]; sampleCount: number };

export function useVoiceId() {
  const activeStream = useRef<MediaStream | null>(null);

  /** Records `durationMs` of audio from the mic and returns an averaged
   * [pitchHz, spectralCentroid] signature. Caller must already hold mic
   * permission (requested via the explicit confirmation flow). */
  const captureSignature = useCallback(
    async (durationMs = 1600): Promise<VoiceCapture | null> => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStream.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const buf = new Float32Array(analyser.fftSize);
      const pitches: number[] = [];
      const centroids: number[] = [];

      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          analyser.getFloatTimeDomainData(buf);
          const pitch = detectPitch(buf, ctx.sampleRate);
          if (pitch) pitches.push(pitch);
          centroids.push(spectralCentroid(buf));

          if (performance.now() - start < durationMs) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        tick();
      });

      stream.getTracks().forEach((t) => t.stop());
      activeStream.current = null;
      ctx.close();

      if (pitches.length === 0) return null;

      const avgPitch = pitches.reduce((a, b) => a + b, 0) / pitches.length;
      const avgCentroid =
        centroids.reduce((a, b) => a + b, 0) / centroids.length;

      return { signature: [avgPitch, avgCentroid], sampleCount: pitches.length };
    },
    []
  );

  const cancel = useCallback(() => {
    activeStream.current?.getTracks().forEach((t) => t.stop());
    activeStream.current = null;
  }, []);

  return { captureSignature, cancel };
}
