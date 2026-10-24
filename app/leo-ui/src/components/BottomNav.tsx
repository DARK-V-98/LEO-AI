"use client";

import {
  Bot,
  LayoutDashboard,
  MessageCircle,
  ListTodo,
  Users,
  Megaphone,
  Search,
  CalendarClock,
  ScrollText,
  AudioLines,
  LucideIcon,
} from "lucide-react";

export type TabId =
  | "home"
  | "overview"
  | "chat"
  | "todo"
  | "leads"
  | "ads"
  | "seo"
  | "events"
  | "log"
  | "voices";

const ITEMS: { id: TabId; label: string; icon: LucideIcon; badge?: number }[] = [
  { id: "home", label: "LEO", icon: Bot },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "todo", label: "To-Do", icon: ListTodo, badge: 5 },
  { id: "leads", label: "Leads", icon: Users, badge: 3 },
  { id: "ads", label: "Ads", icon: Megaphone, badge: 2 },
  { id: "seo", label: "SEO", icon: Search },
  { id: "events", label: "Events", icon: CalendarClock },
  { id: "log", label: "Log", icon: ScrollText },
  { id: "voices", label: "Voices", icon: AudioLines },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <nav className="glass-panel sticky bottom-4 z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-1 overflow-x-auto rounded-2xl px-2 py-2">
      {ITEMS.map(({ id, label, icon: Icon, badge }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] transition-all ${
              isActive
                ? "bg-accent-cyan/10 text-foreground"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Icon
              size={18}
              className={isActive ? "text-accent-cyan" : ""}
            />
            {label}
            {badge ? (
              <span className="absolute right-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-magenta text-[9px] font-bold text-white">
                {badge}
              </span>
            ) : null}
            {isActive ? (
              <span
                className="absolute -bottom-1 h-1 w-6 rounded-full"
                style={{ background: "var(--accent-cyan)" }}
              />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
