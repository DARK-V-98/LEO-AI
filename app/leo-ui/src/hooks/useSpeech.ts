"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Wraps the browser's built-in speech synthesis so LEO can actually talk —
 * no extra API/key needed. Returns a promise that resolves once the line
 * finishes, so callers can sequence mood changes around it. */
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      voiceRef.current = null;
    };
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [supported]);

  const pickVoice = useCallback(() => {
    if (!supported) return null;
    if (voiceRef.current) return voiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    // Only ever pick from English voices — never fall back to voices[0],
    // which can silently be a different language/accent and is what was
    // making LEO's speech sound wrong.
    const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
    const preferred =
      english.find((v) =>
        /Google US English|Google UK English|Natural|Daniel|Matthew|Aria|Samantha/i.test(
          v.name
        )
      ) ?? english[0];
    voiceRef.current = preferred ?? null;
    return voiceRef.current;
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
        utter.lang = "en-US";
        const voice = pickVoice();
        if (voice) utter.voice = voice;
        utter.rate = 1.03;
        utter.pitch = 1.05;
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

  return { speak, cancel, speaking, supported };
}
