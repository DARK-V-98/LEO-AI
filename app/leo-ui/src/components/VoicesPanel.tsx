"use client";

import { useEffect, useState } from "react";
import { AudioLines, UserPlus, Fingerprint, Cloud, CloudOff } from "lucide-react";
import {
  VoiceProfile,
  subscribeVoiceProfiles,
  enrollVoiceProfile,
  touchVoiceProfile,
  matchVoiceProfile,
} from "@/lib/voiceProfiles";
import { useVoiceId } from "@/hooks/useVoiceId";
import { firebaseEnabled } from "@/lib/firebase";
import { MicPermissionState } from "@/hooks/useMicPermission";

export default function VoicesPanel({
  micState,
  onRequestMic,
}: {
  micState: MicPermissionState;
  onRequestMic: () => Promise<boolean>;
}) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<
    [number, number] | null
  >(null);
  const [identified, setIdentified] = useState<string | null>(null);
  const { captureSignature } = useVoiceId();

  useEffect(() => subscribeVoiceProfiles(setProfiles), []);

  async function handleEnroll() {
    if (micState !== "allowed") {
      const ok = await onRequestMic();
      if (!ok) return;
    }
    setBusy(true);
    setIdentified(null);
    const capture = await captureSignature(1800);
    setBusy(false);
    if (!capture) return;
    setPendingSignature(capture.signature);
  }

  async function confirmEnroll() {
    if (!pendingSignature || !pendingName?.trim()) return;
    await enrollVoiceProfile(pendingName.trim(), pendingSignature);
    setPendingSignature(null);
    setPendingName(null);
  }

  async function handleIdentify() {
    if (micState !== "allowed") {
      const ok = await onRequestMic();
      if (!ok) return;
    }
    setBusy(true);
    setIdentified(null);
    const capture = await captureSignature(1600);
    setBusy(false);
    if (!capture) {
      setIdentified("Too quiet — try speaking closer to the mic.");
      return;
    }
    const match = matchVoiceProfile(capture.signature, profiles);
    if (match) {
      touchVoiceProfile(match.id, capture.signature);
      setIdentified(`That sounds like ${match.name}.`);
    } else {
      setIdentified("I don't recognise that voice yet — enroll it below.");
    }
  }

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
            <AudioLines size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Voices LEO knows
            </h2>
            <p className="text-[11px] text-muted">
              Learns who&apos;s speaking by voice, over time
            </p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
            firebaseEnabled
              ? "border-accent-green/40 text-accent-green"
              : "border-accent-amber/40 text-accent-amber"
          }`}
        >
          {firebaseEnabled ? <Cloud size={11} /> : <CloudOff size={11} />}
          {firebaseEnabled ? "Synced via Firebase" : "Local only — no Firebase keys set"}
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-panel-border bg-white/[0.02] p-3 text-[12px] leading-relaxed text-muted">
        LEO uses a lightweight local voiceprint (pitch + tone shape) to tell
        speakers apart — it is not a full AI model, so it runs instantly and
        never leaves this check to a remote call. The first time someone new
        talks to LEO, he&apos;ll ask who they are; after that he recognises
        the voice and greets them by name.
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={handleIdentify}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl border border-panel-border bg-white/[0.02] px-3 py-2 text-xs text-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
        >
          <Fingerprint size={14} className="text-accent-cyan" />
          {busy ? "Listening…" : "Who's talking? (test)"}
        </button>
        <button
          onClick={handleEnroll}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-accent-violet/15 px-3 py-2 text-xs text-accent-violet transition-colors hover:bg-accent-violet/25 disabled:opacity-50"
        >
          <UserPlus size={14} />
          {busy ? "Listening…" : "Enroll a new voice"}
        </button>
      </div>

      {identified ? (
        <div className="mb-4 rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 px-3 py-2 text-xs text-foreground">
          {identified}
        </div>
      ) : null}

      {pendingSignature ? (
        <div className="mb-4 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
          <p className="mb-2 text-xs text-foreground">
            Got a voice sample. What should LEO call this person?
          </p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={pendingName ?? ""}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmEnroll()}
              placeholder="e.g. Thimira"
              className="flex-1 rounded-lg border border-panel-border bg-white/[0.03] px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none"
            />
            <button
              onClick={confirmEnroll}
              className="rounded-lg bg-accent-green/15 px-3 py-1.5 text-xs text-accent-green hover:bg-accent-green/25"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {micState === "denied" ? (
        <div className="mb-4 rounded-xl border border-accent-magenta/30 bg-accent-magenta/5 px-3 py-2 text-xs text-accent-magenta">
          Microphone access was denied — enable it in your browser&apos;s site
          settings to let LEO listen.
        </div>
      ) : null}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {profiles.length === 0 ? (
          <p className="text-xs text-muted">
            No voices learned yet. Enroll one above.
          </p>
        ) : (
          profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-panel-border bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {p.name}
                </p>
                <p className="text-[11px] text-muted">
                  {p.samples} sample{p.samples === 1 ? "" : "s"} · last heard{" "}
                  {new Date(p.lastHeard).toLocaleString()}
                </p>
              </div>
              <span className="font-mono text-[11px] text-accent-cyan">
                {Math.round(p.signature[0])} Hz
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
