"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, Users, User, Lock } from "lucide-react";
import {
  subscribeWhatsAppChatList,
  subscribeWhatsAppChatMessages,
  WhatsAppChatSummary,
  WhatsAppChatMessage,
} from "@/lib/whatsappChats";
import { firebaseEnabled } from "@/lib/firebase";

function chatLabel(chat: WhatsAppChatSummary): string {
  if (chat.isGroup) return `Group · ${chat.jid.split("@")[0]}`;
  return `+${chat.jid.split("@")[0]}`;
}

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WhatsAppChatsPanel() {
  const [chats, setChats] = useState<WhatsAppChatSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppChatMessage[]>([]);

  useEffect(() => subscribeWhatsAppChatList(setChats), []);
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    return subscribeWhatsAppChatMessages(selected, setMessages);
  }, [selected]);

  return (
    <div className="glass-panel flex h-full flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
            <MessagesSquare size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              LEO&apos;s WhatsApp chats
            </h2>
            <p className="text-[11px] text-muted">Every DM and group he&apos;s part of</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-accent-amber/40 px-2 py-0.5 text-[10px] text-accent-amber">
          <Lock size={10} />
          Developer only
        </span>
      </div>

      {!firebaseEnabled ? (
        <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
          <div className="flex min-h-[200px] flex-col gap-1 overflow-y-auto rounded-xl border border-panel-border bg-white/[0.02] p-2 sm:max-h-[420px]">
            {chats.length === 0 ? (
              <p className="p-2 text-xs text-muted">No chats yet.</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelected(chat.jid)}
                  className={`flex flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors ${
                    selected === chat.jid
                      ? "bg-accent-violet/15 text-foreground"
                      : "text-muted hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {chat.isGroup ? <Users size={11} /> : <User size={11} />}
                    {chatLabel(chat)}
                  </span>
                  <span className="truncate text-[11px] text-muted">
                    {chat.lastMessageText}
                  </span>
                  <span className="font-mono text-[10px] text-muted/70">
                    {timeAgo(chat.lastMessageAt)}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex min-h-[200px] flex-col gap-2 overflow-y-auto rounded-xl border border-panel-border bg-white/[0.02] p-3 sm:max-h-[420px]">
            {!selected ? (
              <p className="text-xs text-muted">Select a chat to view its messages.</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted">No messages loaded yet.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "self-start border border-panel-border bg-white/[0.03] text-foreground"
                      : "self-end bg-accent-violet/15 text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
