"use client";

import {
  LayoutDashboard,
  ListTodo,
  Users,
  Megaphone,
  Search,
  CalendarClock,
  ScrollText,
  Settings,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "todo", label: "To-Do", icon: ListTodo, badge: 5 },
  { id: "leads", label: "Leads", icon: Users, badge: 3 },
  { id: "ads", label: "Ad Suggestions", icon: Megaphone, badge: 2 },
  { id: "seo", label: "SEO Health", icon: Search },
  { id: "events", label: "Events", icon: CalendarClock },
  { id: "activity", label: "Activity Log", icon: ScrollText },
];

export default function Sidebar() {
  const [active, setActive] = useState("dashboard");

  return (
    <aside className="glass-panel relative hidden w-64 flex-col justify-between rounded-2xl p-4 lg:flex">
      <div>
        <div className="mb-8 flex items-center gap-3 px-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
              boxShadow: "0 0 24px -4px rgba(0,229,255,0.6)",
            }}
          >
            L
          </div>
          <div>
            <p className="text-glow-cyan text-sm font-semibold tracking-wide text-foreground">
              LEO AI
            </p>
            <p className="text-[11px] text-muted">SmartLabs NeuraLink</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? "bg-accent-cyan/10 text-foreground glow-border"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={isActive ? "text-accent-cyan" : ""}
                  />
                  {label}
                </span>
                {badge ? (
                  <span className="rounded-full bg-accent-magenta/20 px-2 py-0.5 text-[11px] font-medium text-accent-magenta">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground">
          <Settings size={17} />
          Settings
        </button>
        <div className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
          </span>
          Scheduler heartbeat · every 30m
        </div>
      </div>
    </aside>
  );
}
