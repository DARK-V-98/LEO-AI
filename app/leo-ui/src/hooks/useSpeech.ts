"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SINHALA_PATTERN = /[඀-෿]/;
// LEO is a male persona — prefer a voice the OS/browser labels male, or a
// common male voice name, over whatever the browser's default happens to
// be (which is very often a female-sounding voice by default on most
// platforms).
const MALE_VOICE_HINT =
  /\bmale\b|Daniel|Matthew|David|Guy|Alex|Fred|George|Oliver|James|Ryan|Mark|Arthur|Eddy|Rishi/i;

/** Wraps the browser's built-in speech synthesis so LEO can actually talk —
 * no extra API/key needed. Returns a promise that resolves once the line
 * finishes, so callers can sequence mood changes around it. Auto-detects
 * Sinhala text and switches voice/language accordingly. */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const voicesCacheRef = useRef<Record<string, SpeechSynthesisVoice | null>>({});
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      voicesCacheRef.current = {};
    };
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [supported]);

  const pickVoice = useCallback((langPrefix: "en" | "si") => {
    if (!supported) return null;
    if (langPrefix in voicesCacheRef.current) return voicesCacheRef.current[langPrefix];

    const voices = window.speechSynthesis.getVoices();
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
    const male = matching.filter((v) => MALE_VOICE_HINT.test(v.name));
    const preferred =
      // A male voice that also sounds natural beats a male voice that
      // doesn't, which beats any non-male match, which beats nothing.
      male.find((v) => /Natural/i.test(v.name)) ??
      male[0] ??
      matching.find((v) => /Google US English|Google UK English|Natural/i.test(v.name)) ??
      matching[0];

    voicesCacheRef.current[langPrefix] = preferred ?? null;
    return preferred ?? null;
  }, [supported]);

  /** True if the device/browser has at least one installed Sinhala voice —
   * many don't, in which case Sinhala text still gets spoken but with
   * whatever default voice the browser falls back to for an unmatched
   * language, which may mispronounce it. */
  const hasSinhalaVoice = useCallback(() => {
    if (!supported) return false;
    return window.speechSynthesis
      .getVoices()
      .some((v) => v.lang.toLowerCase().startsWith("si"));
  }, [supported]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!supported || !text.trim()) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);

        const isSinhala = SINHALA_PATTERN.test(text);
        utter.lang = isSinhala ? "si-LK" : "en-US";
        const voice = pickVoice(isSinhala ? "si" : "en");
        if (voice) utter.voice = voice;

        utter.rate = isSinhala ? 0.95 : 1.03;
        // Slightly below neutral (1.0) reads as a lower, more male-leaning
        // pitch — matters most when no explicitly-male voice was found
        // above and this is falling back to whatever default voice the
        // browser picked.
        utter.pitch = 0.92;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utter.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utter);
      }),
    [supported, pickVoice]
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, cancel, speaking, supported, hasSinhalaVoice };
}
