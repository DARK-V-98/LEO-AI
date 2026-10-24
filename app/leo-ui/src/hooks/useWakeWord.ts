"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WakeState = "idle" | "listening" | "awake" | "unsupported" | "denied";

const WAKE_PATTERN = /\bhey\s+leo\b|\bleo\b/i;

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
 */
export function useWakeWord(onWake: (command: string) => void) {
  const [state, setState] = useState<WakeState>("idle");
  const [enabled, setEnabled] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const awakeRef = useRef(false);
  const collectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommand = useRef("");
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;
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
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const finalizeCommand = () => {
      const command = pendingCommand.current;
      awakeRef.current = false;
      setState("listening");
      onWakeRef.current(command);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setLastTranscript(transcript);

      if (!awakeRef.current) {
        if (!WAKE_PATTERN.test(transcript)) return;
        awakeRef.current = true;
        setState("awake");
      }

      // Whether this is the triggering event or a continuation, strip any
      // wake-word prefix and keep collecting until speech pauses.
      pendingCommand.current = transcript.split(WAKE_PATTERN).pop()?.trim() ?? "";
      clearCollectTimer();
      collectTimer.current = setTimeout(finalizeCommand, COLLECT_SILENCE_MS);
    };

    recognition.onerror = (event) => {
      const err = (event as unknown as { error?: string }).error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        setState("denied");
        setEnabled(false);
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

  return { state, enabled, toggle, pause, resume, lastTranscript, supported };
}
