"use client";

import Image from "next/image";
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Cpu,
  Bot,
  BarChart3,
  Users,
  Link2,
  Settings,
  Mic,
  ListChecks,
} from "lucide-react";

export type NavId =
  | "home"
  | "conversations"
  | "knowledge"
  | "ai-model"
  | "chatbot-setup"
  | "analytics"
  | "users"
  | "integrations"
  | "settings"
  | "chat"
  | "voices";

const NAV_ITEMS: { id: NavId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "ai-model", label: "AI Model", icon: Cpu },
  { id: "chatbot-setup", label: "Chatbot Setup", icon: Bot },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "users", label: "Users & Access", icon: Users },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const WORKSPACE_ITEMS: { id: NavId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "chat", label: "Talk to LEO", icon: Mic },
  { id: "voices", label: "Voice Profiles", icon: ListChecks },
];

export default function Sidebar({
  active,
  onChange,
  className = "",
}: {
  active: NavId;
  onChange: (id: NavId) => void;
  className?: string;
}) {
  return (
    <aside className={`glass-panel flex w-64 flex-shrink-0 flex-col gap-1 rounded-2xl p-4 ${className}`}>
      <div className="mb-4 flex items-center gap-2.5 px-1">
        <Image src="/leo-logo.png" alt="LEO AI" width={36} height={36} className="rounded-lg" />
        <div>
          <p className="text-sm font-bold leading-tight text-foreground">
            Leo <span className="text-accent-cyan">AI</span>
          </p>
          <p className="text-[10px] leading-tight text-muted">SmartLabs AI Assistant</p>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-cyan/12 text-accent-cyan"
                  : "text-muted hover:bg-black/[0.04] hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="my-2 h-px bg-panel-border" />

      <nav className="flex flex-col gap-0.5">
        {WORKSPACE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-cyan/12 text-accent-cyan"
                  : "text-muted hover:bg-black/[0.04] hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2 rounded-2xl bg-accent-cyan/5 p-4 text-center">
        <Image src="/leo-logo.png" alt="" width={56} height={56} className="rounded-xl" />
        <p className="text-xs font-semibold text-foreground">Leo AI</p>
        <p className="text-[10px] leading-snug text-muted">Your 24/7 Smart Learning Assistant</p>
      </div>
    </aside>
  );
}
