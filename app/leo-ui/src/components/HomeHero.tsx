"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Ear, ShieldCheck, Check, X } from "lucide-react";
import LeoFace, { LeoMood } from "./LeoFace";
import { useWakeWord } from "@/hooks/useWakeWord";
import { MicPermissionState } from "@/hooks/useMicPermission";
import { useVoiceId } from "@/hooks/useVoiceId";
import { subscribeVoiceProfiles, matchVoiceProfile, VoiceProfile } from "@/lib/voiceProfiles";

export default function HomeHero({
  onHeardCommand,
  micState,
  onRequestMic,
}: {
  onHeardCommand: (text: string) => void;
  micState: MicPermissionState;
  onRequestMic: () => Promise<boolean>;
}) {
  const [micGateSeen, setMicGateSeen] = useState(false);
  const [mood, setMood] = useState<LeoMood>("idle");
  const [greeting, setGreeting] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const moodTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { captureSignature } = useVoiceId();

  useEffect(() => subscribeVoiceProfiles(setProfiles), []);

  function runMoodCycle() {
    moodTimers.current.forEach(clearTimeout);
    moodTimers.current = [];
    setMood("listening");
    moodTimers.current.push(
      setTimeout(() => setMood("thinking"), 1400),
      setTimeout(() => setMood("speaking"), 2800),
      setTimeout(() => setMood("idle"), 4600)
    );
  }

  const { state: wakeState, enabled, toggle, supported } = useWakeWord((command) => {
    runMoodCycle();
    onHeardCommand(command || "(wake word only)");

    if (profiles.length > 0) {
      captureSignature(1200).then((capture) => {
        if (!capture) return;
        const match = matchVoiceProfile(capture.signature, profiles);
        setGreeting(match ? `Hi ${match.name}, I'm listening.` : "I don't recognise this voice yet.");
        setTimeout(() => setGreeting(null), 4000);
      });
    }
  });

  async function handleAllow() {
    const ok = await onRequestMic();
    setMicGateSeen(true);
    if (ok) toggle();
  }

  return (
    <div className="glass-panel relative flex flex-col items-center gap-4 overflow-hidden rounded-2xl p-6">
      <LeoFace mood={mood} size={168} />

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
              : micState === "denied"
                ? "Microphone blocked in browser settings"
                : wakeState === "awake"
                  ? "Awake — go ahead"
                  : enabled
                    ? "Always on, say “Leo” anytime"
                    : "Wake-word listening is off"}
          </span>
        </div>
      )}
    </div>
  );
}
