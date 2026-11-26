"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

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

type MoodContextValue = {
  mood: LeoMood;
  setMood: (mood: LeoMood) => void;
};

const MoodContext = createContext<MoodContextValue>({
  mood: "idle",
  setMood: () => {},
});

export function LeoMoodProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMood] = useState<LeoMood>("idle");
  return (
    <MoodContext.Provider value={{ mood, setMood }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useLeoMood() {
  return useContext(MoodContext);
}

const MOOD_HEX: Record<LeoMood, string> = {
  idle: "#0891b2",
  listening: "#db2777",
  thinking: "#7c3aed",
  speaking: "#0891b2",
  happy: "#059669",
  alert: "#d97706",
  sad: "#2563eb",
  confused: "#b45309",
  angry: "#dc2626",
};

/** Mounted once near the app root — recolors the whole UI's primary accent
 * to match LEO's current mood, so the entire system visibly reacts to how
 * he's "feeling", not just the orb itself. */
export function LeoThemeSync() {
  const { mood } = useLeoMood();
  const lastHex = useRef<string | null>(null);

  useEffect(() => {
    const hex = MOOD_HEX[mood];
    if (lastHex.current === hex) return;
    lastHex.current = hex;
    document.documentElement.style.setProperty("--accent-cyan", hex);
  }, [mood]);

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty("--accent-cyan");
    };
  }, []);

  return null;
}
