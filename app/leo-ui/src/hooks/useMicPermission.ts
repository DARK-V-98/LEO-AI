"use client";

import { useCallback, useState } from "react";

export type MicPermissionState = "unset" | "allowed" | "denied";

/** Single explicit "may LEO use the mic" gate, shared by wake-word listening
 * and voice enrollment — the browser's own permission prompt is the actual
 * OS-level confirmation; this tracks whether the user has said yes in LEO's
 * own UI first. */
export function useMicPermission() {
  const [state, setState] = useState<MicPermissionState>("unset");

  const request = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setState("allowed");
      return true;
    } catch {
      setState("denied");
      return false;
    }
  }, []);

  return { state, request };
}
