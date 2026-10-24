"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Ear, ShieldCheck, Check, X, RotateCw, Settings2 } from "lucide-react";
import LeoOrb, { LeoMood } from "./LeoOrb";
import { useWakeWord } from "@/hooks/useWakeWord";
import { MicErrorKind, MicPermissionState } from "@/hooks/useMicPermission";
import { useVoiceId } from "@/hooks/useVoiceId";
import { useSpeech } from "@/hooks/useSpeech";
import { subscribeVoiceProfiles, matchVoiceProfile, touchVoiceProfile, VoiceProfile } from "@/lib/voiceProfiles";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Races a promise against a timeout so a stalled mic/getUserMedia call can
 * never leave the response flow stuck. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

const ERROR_COPY: Record<MicErrorKind, { title: string; detail: string }> = {
  blocked: {
    title: "Microphone is blocked for this site",
    detail:
      'Your browser already said no once, so it won’t ask again here. Click the lock/site-info icon in the address bar → Permissions → Microphone → Allow, then reload this page.',
  },
  "no-device": {
    title: "No microphone found",
    detail: "Check that a microphone is connected and not in use by another app, then try again.",
  },
  insecure: {
    title: "This page isn't secure",
    detail: "Microphone access needs HTTPS (or localhost). Open LEO over a secure https:// link.",
  },
  unsupported: {
    title: "This browser doesn't support microphone access",
    detail: "Try the latest Chrome, Edge, or Safari.",
  },
  unknown: {
    title: "Couldn't get microphone access",
    detail: "Try again, or check your browser's site settings for this page.",
  },
};

function useOrbSize() {
  const [size, setSize] = useState(260);
  useEffect(() => {
    const compute = () => {
      const next = Math.min(window.innerWidth * 0.62, window.innerHeight * 0.42, 420);
      setSize(Math.max(220, Math.round(next)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return size;
}

export default function HomeHero({
  onHeardCommand,
  micState,
  micError,
  onRequestMic,
}: {
  onHeardCommand: (text: string) => void;
  micState: MicPermissionState;
  micError: MicErrorKind | null;
  onRequestMic: () => Promise<boolean>;
}) {
  const [micGateSeen, setMicGateSeen] = useState(false);
  const [mood, setMood] = useState<LeoMood>("idle");
  const [greeting, setGreeting] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const { captureSignature } = useVoiceId();
  const { speak } = useSpeech();
  const orbSize = useOrbSize();
  const respondRef = useRef<(command: string) => void>(() => {});

  useEffect(() => subscribeVoiceProfiles(setProfiles), []);

  const {
    state: wakeState,
    enabled,
    toggle,
    pause,
    resume,
    supported,
    lastTranscript,
  } = useWakeWord((command) => respondRef.current(command));

  async function respondToWake(command: string) {
    onHeardCommand(command || "(wake word only)");
    setMood("listening");
    await delay(500);
    setMood("thinking");

    // Stop listening while we work out who's talking and while LEO
    // replies — otherwise the mic can pick LEO's own voice back up
    // through the speakers and re-trigger the wake flow forever.
    pause();

    let name: string | undefined;
    if (profiles.length > 0) {
      const capture = await withTimeout(captureSignature(1000), 1800);
      if (capture) {
        const match = matchVoiceProfile(capture.signature, profiles);
        if (match) {
          name = match.name;
          touchVoiceProfile(match.id, capture.signature);
        }
      }
    }

    const text = name ? `Hi ${name}, I'm listening.` : "I'm listening.";
    setGreeting(text);
    setMood("speaking");
    await speak(text);
    setMood("idle");
    resume();
    setTimeout(() => setGreeting(null), 2500);
  }

  respondRef.current = respondToWake;

  async function handleAllow() {
    const ok = await onRequestMic();
    setMicGateSeen(true);
    if (ok) toggle();
  }

  return (
    <div className="glass-panel relative flex min-h-[72vh] flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl p-6">
      <div className="flex flex-col items-center gap-2">
        <LeoOrb mood={mood} size={orbSize} showLabel hud />
        <h1 className="mt-2 text-xl font-semibold tracking-wide text-foreground">
          LEO
        </h1>
        <p className="font-mono text-[11px] text-muted">
          SmartLabs NeuraLink · always on
        </p>
      </div>

      {greeting ? (
        <div className="fade-up rounded-full border border-accent-cyan/30 bg-accent-cyan/5 px-4 py-1 text-xs text-foreground">
          {greeting}
        </div>
      ) : null}

      {!micGateSeen && micState === "unset" ? (
        <div className="w-full max-w-sm rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium text-accent-amber">
            <ShieldCheck size={14} />
            LEO wants microphone access
          </div>
          <p className="mb-3 text-[12px] text-muted">
            So he can hear you say &quot;Leo&quot; and know who&apos;s talking.
            Nothing is recorded or sent anywhere until you say his name.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleAllow}
              className="flex items-center gap-1 rounded-lg bg-accent-green/15 px-3 py-1.5 text-xs font-medium text-accent-green hover:bg-accent-green/25"
            >
              <Check size={13} /> Allow
            </button>
            <button
              onClick={() => setMicGateSeen(true)}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-muted hover:bg-white/10"
            >
              <X size={13} /> Not now
            </button>
          </div>
        </div>
      ) : micState === "denied" && micError ? (
        <div className="w-full max-w-sm rounded-xl border border-accent-magenta/30 bg-accent-magenta/5 p-4 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium text-accent-magenta">
            <Settings2 size={14} />
            {ERROR_COPY[micError].title}
          </div>
          <p className="mb-3 text-[12px] text-muted">{ERROR_COPY[micError].detail}</p>
          <div className="flex justify-center gap-2">
            {micError === "blocked" ? (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/10"
              >
                <RotateCw size={13} /> Reload page
              </button>
            ) : (
              <button
                onClick={handleAllow}
                className="flex items-center gap-1 rounded-lg bg-accent-green/15 px-3 py-1.5 text-xs font-medium text-accent-green hover:bg-accent-green/25"
              >
                <Check size={13} /> Try again
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => (micState === "allowed" ? toggle() : handleAllow())}
            disabled={!supported}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${
              enabled
                ? "bg-accent-magenta/15 text-accent-magenta hover:bg-accent-magenta/25"
                : "bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25"
            }`}
          >
            {enabled ? <Mic size={14} /> : <MicOff size={14} />}
            {enabled ? "Listening for “Leo” — tap to stop" : "Tap to let LEO listen for his name"}
          </button>

          <span className="flex items-center gap-1 font-mono text-[10px] text-muted">
            <Ear size={11} className={enabled ? "text-accent-green" : ""} />
            {!supported
              ? "Voice wake isn't supported in this browser"
              : wakeState === "awake"
                ? "Awake — go ahead"
                : enabled
                  ? "Always on, say “Leo” anytime"
                  : "Wake-word listening is off"}
          </span>

          {enabled ? (
            <span className="max-w-xs truncate font-mono text-[10px] text-muted/70">
              hearing: {lastTranscript || "…"}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
