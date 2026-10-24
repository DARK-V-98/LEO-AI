"use client";

import { useEffect, useState } from "react";
import { Mic, Send, ShieldCheck, Check, X, Volume2, VolumeX, MessageCircle } from "lucide-react";
import LeoOrb, { LeoMood } from "./LeoOrb";
import { useSpeech } from "@/hooks/useSpeech";
import { useDictation } from "@/hooks/useDictation";
import { VoiceLang } from "@/hooks/useWakeWord";
import { subscribeChatHistory, appendChatMessage } from "@/lib/chatHistory";
import { logActivity } from "@/lib/companyData";
import { firebaseEnabled } from "@/lib/firebase";

type Message = {
  id: string;
  from: "leo" | "user";
  text: string;
  confirm?: {
    action: string;
    detail: string;
  };
};

export default function ChatPanel({
  voiceLang,
  uid,
}: {
  voiceLang: VoiceLang;
  uid: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const { speak, cancel, speaking } = useSpeech();
  const dictation = useDictation(voiceLang);
  const listening = dictation.active;

  useEffect(
    () =>
      subscribeChatHistory(uid, (history) =>
        setMessages(history.map((m) => ({ id: m.id, from: m.from, text: m.text })))
      ),
    [uid]
  );

  const mood: LeoMood = speaking
    ? "speaking"
    : thinking
      ? "thinking"
      : listening
        ? "listening"
        : "idle";

  const persisted = firebaseEnabled && Boolean(uid);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);

    const nextHistory = [
      ...messages,
      { id: "pending", from: "user" as const, text },
    ].map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));

    if (persisted) {
      await appendChatMessage(uid, "user", text);
    } else {
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "user", text }]);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "Sorry, I didn't catch that — try again?";
      if (persisted) {
        await appendChatMessage(uid, "leo", reply);
      } else {
        setMessages((m) => [...m, { id: crypto.randomUUID(), from: "leo", text: reply }]);
      }
      setThinking(false);
      logActivity("Chat reply sent", text.length > 60 ? text.slice(0, 60) + "…" : text, "ok");
      if (voiceOn) await speak(reply);
    } catch {
      const reply = "I couldn't reach my systems just now — try again shortly.";
      if (persisted) {
        await appendChatMessage(uid, "leo", reply);
      } else {
        setMessages((m) => [...m, { id: crypto.randomUUID(), from: "leo", text: reply }]);
      }
      setThinking(false);
      if (voiceOn) await speak(reply);
    }
  }

  function toggleVoice() {
    if (voiceOn) cancel();
    setVoiceOn((v) => !v);
  }

  function handleMicClick() {
    if (dictation.active) {
      const text = dictation.stop();
      if (text) send(text);
    } else {
      cancel(); // don't let LEO's own voice bleed into the mic
      dictation.start();
    }
  }

  function resolveConfirm(id: string, approved: boolean) {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              confirm: undefined,
              text:
                msg.text +
                (approved
                  ? " ✅ Confirmed — executing now, action logged."
                  : " ❌ Cancelled by user."),
            }
          : msg
      )
    );
  }

  return (
    <div className="glass-panel scanline relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-panel-border px-5 py-4">
        <div className="flex items-center gap-3">
          <LeoOrb size={32} mood={mood} />
          <div>
            <p className="text-sm font-semibold text-foreground">Ask LEO</p>
            <p className="font-mono text-[11px] text-muted">
              {speaking ? "SPEAKING…" : listening ? "LISTENING…" : "voice + text"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            className="flex items-center gap-1 rounded-full border border-panel-border px-2 py-1 text-[10px] text-muted transition-colors hover:text-foreground"
            title={voiceOn ? "Mute LEO's voice" : "Unmute LEO's voice"}
          >
            {voiceOn ? <Volume2 size={11} /> : <VolumeX size={11} />}
          </button>
          <span className="flex items-center gap-1 rounded-full border border-panel-border px-2 py-1 text-[10px] text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-green" />
            </span>
            LEO Engine
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !thinking ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
            <MessageCircle size={20} className="opacity-50" />
            <p className="text-xs">
              Say hi to LEO, or type/talk what you need done.
            </p>
          </div>
        ) : null}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`fade-up flex ${
              msg.from === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.from === "user"
                  ? "bg-accent-cyan/15 text-foreground"
                  : "border border-panel-border bg-white/[0.03] text-foreground"
              }`}
            >
              {msg.text}

              {msg.confirm ? (
                <div className="mt-3 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-accent-amber">
                    <ShieldCheck size={13} />
                    Confirmation required
                  </div>
                  <p className="mt-1 text-xs text-foreground">
                    {msg.confirm.action}
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    {msg.confirm.detail}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => resolveConfirm(msg.id, true)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-green/15 py-1.5 text-xs font-medium text-accent-green transition-colors hover:bg-accent-green/25"
                    >
                      <Check size={13} /> Yes, proceed
                    </button>
                    <button
                      onClick={() => resolveConfirm(msg.id, false)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-accent-magenta/15 py-1.5 text-xs font-medium text-accent-magenta transition-colors hover:bg-accent-magenta/25"
                    >
                      <X size={13} /> No
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {thinking ? (
          <div className="fade-up flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl border border-panel-border bg-white/[0.03] px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="eq-bar h-2 w-2 rounded-full bg-accent-cyan"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-panel-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-panel-border bg-white/[0.02] px-3 py-2">
          <button
            onClick={handleMicClick}
            disabled={!dictation.supported}
            title={
              dictation.supported
                ? listening
                  ? "Stop and send"
                  : "Talk to LEO"
                : "Voice input isn't supported in this browser"
            }
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
              listening
                ? "bg-accent-magenta/20 text-accent-magenta"
                : "text-muted hover:text-accent-cyan"
            }`}
          >
            <Mic size={16} />
          </button>

          {listening ? (
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <div className="flex h-5 items-center gap-0.5">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    key={i}
                    className="eq-bar w-[3px] rounded-full bg-accent-magenta"
                    style={{
                      height: `${30 + ((i * 37) % 60)}%`,
                      animationDelay: `${(i % 6) * 0.12}s`,
                    }}
                  />
                ))}
              </div>
              <span className="truncate text-xs text-muted">
                {dictation.transcript || "listening…"}
              </span>
            </div>
          ) : (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tell LEO what to do…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          )}

          <button
            onClick={() => send()}
            disabled={thinking || listening}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-accent-cyan transition-colors hover:bg-accent-cyan/10 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
