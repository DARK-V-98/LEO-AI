"use client";

import { useState } from "react";
import { Mic, Send, ShieldCheck, Check, X, Sparkles } from "lucide-react";
import AiOrb from "./AiOrb";

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

  function send() {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), from: "user", text: input.trim() },
    ]);
    setInput("");
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
          <AiOrb size={32} status={listening ? "listening" : "online"} />
          <div>
            <p className="text-sm font-semibold text-foreground">Ask LEO</p>
            <p className="font-mono text-[11px] text-muted">
              {listening ? "LISTENING…" : "voice + text · multi-model"}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-panel-border px-2 py-1 text-[10px] text-muted">
          <Sparkles size={11} className="text-accent-violet" />
          Gemini
        </span>
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
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-accent-cyan transition-colors hover:bg-accent-cyan/10"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
