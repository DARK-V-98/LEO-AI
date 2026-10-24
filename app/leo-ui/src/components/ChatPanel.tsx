"use client";

import { useState } from "react";
import { Mic, Send, ShieldCheck, Check, X, Volume2, VolumeX } from "lucide-react";
import LeoOrb, { LeoMood } from "./LeoOrb";
import { useSpeech } from "@/hooks/useSpeech";

type Message = {
  id: string;
  from: "leo" | "user";
  text: string;
  confirm?: {
    action: string;
    detail: string;
  };
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    from: "leo",
    text: "Morning, Thimira. Heartbeat check at 09:30 found 2 new leads, 1 SEO issue, and a pending LMS enrolment. Daily digest sent to WhatsApp.",
  },
  {
    id: "m2",
    from: "user",
    text: "Go ahead and accept the new student in the LMS, then open YouTube and play our latest ad reel.",
  },
  {
    id: "m3",
    from: "leo",
    text: "Got it. Before I touch anything outside this chat, I need your go-ahead for each action:",
    confirm: {
      action: "Accept student enrolment — [email protected]",
      detail: "LMS admin account · irreversible action",
    },
  },
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const { speak, cancel, speaking } = useSpeech();

  const mood: LeoMood = speaking
    ? "speaking"
    : thinking
      ? "thinking"
      : listening
        ? "listening"
        : "idle";

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;

    const nextMessages = [
      ...messages,
      { id: crypto.randomUUID(), from: "user" as const, text },
    ];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: nextMessages.map((m) => ({
            role: m.from === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
      const reply: string = data.reply ?? "Sorry, I didn't catch that — try again?";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "leo", text: reply },
      ]);
      setThinking(false);
      if (voiceOn) await speak(reply);
    } catch {
      const reply = "I couldn't reach my systems just now — try again shortly.";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), from: "leo", text: reply },
      ]);
      setThinking(false);
      if (voiceOn) await speak(reply);
    }
  }

  function toggleVoice() {
    if (voiceOn) cancel();
    setVoiceOn((v) => !v);
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
            onClick={() => setListening((v) => !v)}
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
              listening
                ? "bg-accent-magenta/20 text-accent-magenta"
                : "text-muted hover:text-accent-cyan"
            }`}
          >
            <Mic size={16} />
          </button>

          {listening ? (
            <div className="flex h-5 flex-1 items-center gap-0.5">
              {Array.from({ length: 24 }).map((_, i) => (
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
            onClick={send}
            disabled={thinking}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-accent-cyan transition-colors hover:bg-accent-cyan/10 disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
