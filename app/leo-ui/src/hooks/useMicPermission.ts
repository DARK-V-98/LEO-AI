"use client";

import { useCallback, useState } from "react";

export type MicPermissionState = "unset" | "allowed" | "denied";

export type MicErrorKind =
  | "blocked" // browser/site previously denied — won't even show the prompt again
  | "no-device" // no microphone found
  | "insecure" // not HTTPS/localhost — getUserMedia unavailable at all
  | "unsupported" // no mediaDevices API in this browser
  | "unknown";

/** Single explicit "may LEO use the mic" gate, shared by wake-word listening
 * and voice enrollment — the browser's own permission prompt is the actual
 * OS-level confirmation; this tracks whether the user has said yes in LEO's
 * own UI first, and — importantly — *why* it failed when it does, since a
 * browser that already auto-denies won't show any prompt at all on a retry. */
export function useMicPermission() {
  const [state, setState] = useState<MicPermissionState>("unset");
  const [error, setError] = useState<MicErrorKind | null>(null);

  const request = useCallback(async () => {
    setError(null);

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setState("denied");
      setError("insecure");
      return false;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("denied");
      setError("unsupported");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState("allowed");
      return true;
    } catch (err) {
      setState("denied");
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("no-device");
      } else if (
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        name === "SecurityError"
      ) {
        setError("blocked");
      } else {
        setError("unknown");
      }
      return false;
    }
  }, []);

  return { state, error, request };
}
