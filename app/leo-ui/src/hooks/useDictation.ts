"use client";

import { useCallback, useRef, useState } from "react";

/** Push-to-talk style dictation: start() begins transcribing speech into
 * `transcript` live, stop() ends it and returns the final text. Separate
 * from useWakeWord (which only watches for "Leo") — this is for when the
 * user is already in a chat and just wants to talk instead of type. */
export function useDictation() {
  const [transcript, setTranscript] = useState("");
  const [active, setActive] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition!;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalRef.current = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalRef.current += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript((finalRef.current + " " + interim).trim());
    };

    recognition.onend = () => {
      setActive(false);
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setActive(true);
    try {
      recognition.start();
    } catch {
      /* already running */
    }
  }, [supported]);

  const stop = useCallback((): string => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setActive(false);
    return (finalRef.current || transcript).trim();
  }, [transcript]);

  return { start, stop, transcript, active, supported };
}
