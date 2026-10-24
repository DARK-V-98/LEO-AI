"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WakeState = "idle" | "listening" | "awake" | "unsupported" | "denied";
export type VoiceLang = "en-US" | "si-LK";

// Errors the browser can report that aren't a flat permission denial —
// these used to be silently swallowed, so the UI kept showing "listening"
// while the mic had actually stopped capturing anything at all.
const SILENT_RETRY_ERRORS = new Set(["no-speech", "aborted"]);

const WAKE_PATTERN_EN = /\bhey\s+leo\b|\bleo\b/i;
// Best-effort Sinhala phonetic spellings of "Leo" — speech recognition
// transcribes names inconsistently, so this is approximate, not exact.
const WAKE_PATTERN_SI = /\bලියෝ\b|\bhey\s+leo\b|\bleo\b/i;

// How long to wait, after the last bit of new speech, before treating the
// command as finished and handing it off. Without this, the hook used to
// fire the instant it heard "Leo" — cutting "Leo, open YouTube" down to
// just "Leo" and throwing the rest away.
const COLLECT_SILENCE_MS = 1000;

/**
 * Always-on "say the wake word" listener. This never calls an LLM — it's a
 * plain speech-to-text loop watching only for the word "Leo" (or "Hey Leo").
 * Only once a full command is collected (speech pauses) does anything get
 * handed to the AI layer, same as a phone's "Hey Siri" detector sitting in
 * front of the actual assistant.
 *
 * `lang` picks the recognition language (speech recognition only supports
 * one at a time). Changing it only takes effect the next time listening is
 * turned on — it won't live-swap mid-session.
 */
export function useWakeWord(onWake: (command: string) => void, lang: VoiceLang = "en-US") {
  const [state, setState] = useState<WakeState>("idle");
  const [enabled, setEnabled] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [micErrorKind, setMicErrorKind] = useState<string | null>(null);
  // True once the browser confirms audio is actually flowing in from the
  // mic — separate from `enabled`/`state`, which only reflect that
  // recognition.start() was *called*, not that any sound is reaching it.
  // This is what tells "the toggle is on but he genuinely can't hear me"
  // apart from "a wake word just hasn't been said yet".
  const [audioActive, setAudioActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const awakeRef = useRef(false);
  const collectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommand = useRef("");
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
  const langRef = useRef(lang);
  langRef.current = lang;
  const enabledRef = useRef(false);
  const pausedRef = useRef(false);

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const clearCollectTimer = () => {
    if (collectTimer.current) {
      clearTimeout(collectTimer.current);
      collectTimer.current = null;
    }
  };

  const stop = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    clearCollectTimer();
    awakeRef.current = false;
    setState("idle");
    setMicErrorKind(null);
    setAudioActive(false);
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    setMicErrorKind(null);
    setAudioActive(false);
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;
    const wakePattern = langRef.current === "si-LK" ? WAKE_PATTERN_SI : WAKE_PATTERN_EN;

    // Fires as soon as the browser is actually capturing audio from the
    // mic — not standardized across every engine, so this is a best-effort
    // signal, but Chrome/Edge (the browsers this actually works in) fire it
    // reliably.
    recognition.onaudiostart = () => {
      setAudioActive(true);
    };

    const finalizeCommand = () => {
      const command = pendingCommand.current;
      awakeRef.current = false;
      setState("listening");
      onWakeRef.current(command);
    };

    recognition.onresult = (event) => {
      setMicErrorKind(null);
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setLastTranscript(transcript);

      if (!awakeRef.current) {
        if (!wakePattern.test(transcript)) return;
        awakeRef.current = true;
        setState("awake");
      }

      // Whether this is the triggering event or a continuation, strip any
      // wake-word prefix and keep collecting until speech pauses.
      pendingCommand.current = transcript.split(wakePattern).pop()?.trim() ?? "";
      clearCollectTimer();
      collectTimer.current = setTimeout(finalizeCommand, COLLECT_SILENCE_MS);
    };

    recognition.onerror = (event) => {
      const err = (event as unknown as { error?: string }).error ?? "unknown";
      if (err === "not-allowed" || err === "service-not-allowed") {
        setState("denied");
        setEnabled(false);
        return;
      }
      // "no-speech"/"aborted" are routine in continuous mode (the browser
      // times a listening window out with nobody talking) — onend already
      // restarts for those. Anything else (most commonly "audio-capture",
      // meaning the mic device itself dropped out or got grabbed by
      // another app/tab) used to be silently ignored, which left the UI
      // saying "listening" while nothing was actually being captured.
      if (!SILENT_RETRY_ERRORS.has(err)) {
        console.warn(`[LEO wake word] speech recognition error: ${err}`);
        setMicErrorKind(err);
      }
    };

    recognition.onend = () => {
      // continuous mode can still be cut off by the browser — restart
      // automatically while the user has it switched on. Reads the refs
      // (not closed-over values) so a stop()/pause() that happened after
      // this listener was created is still respected — and so a
      // deliberate pause() (used while LEO is speaking, to stop him
      // hearing and re-triggering on his own voice) doesn't get
      // immediately undone by this same auto-restart.
      if (enabledRef.current && !pausedRef.current) {
        try {
          recognition.start();
        } catch {
          /* already starting */
        }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState("listening");
    } catch {
      /* no-op: already running */
    }
  }, [supported]);

  const toggle = useCallback(() => {
    if (enabledRef.current) {
      stop();
    } else {
      enabledRef.current = true;
      setEnabled(true);
    }
  }, [stop]);

  /** Stop listening without turning wake-word mode off — used while LEO is
   * speaking so he can't hear and re-trigger on his own voice. */
  const pause = useCallback(() => {
    pausedRef.current = true;
    awakeRef.current = false;
    clearCollectTimer();
    recognitionRef.current?.stop();
  }, []);

  /** Resume listening after pause(), if wake-word mode is still on. */
  const resume = useCallback(() => {
    pausedRef.current = false;
    if (enabledRef.current) start();
  }, [start]);

  useEffect(() => {
    if (enabled) start();
    return () => {
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { state, enabled, toggle, pause, resume, lastTranscript, supported, micErrorKind, audioActive };
}
