"use client";

import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const EVENTS = [
  {
    id: 1,
    title: "WhatsApp digest sent",
    detail: "4 connectors reported · 09:30 heartbeat",
    time: "2m ago",
    type: "ok",
  },
  {
    id: 2,
    title: "New lead captured",
    detail: "Meta Lead Ads — \"Diploma in AI\" campaign",
    time: "6m ago",
    type: "ok",
  },
  {
    id: 3,
    title: "SEO issue found",
    detail: "Missing meta description on /courses/ai-diploma",
    time: "6m ago",
    type: "warn",
  },
  {
    id: 4,
    title: "Awaiting confirmation",
    detail: "LMS enrolment accept — [email protected]",
    time: "just now",
    type: "pending",
  },
];

const ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  ok: { icon: CheckCircle2, color: "var(--accent-green)" },
  warn: { icon: AlertTriangle, color: "var(--accent-amber)" },
  pending: { icon: Clock, color: "var(--accent-cyan)" },
};

export default function ActivityFeed() {
  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Live activity
        </h2>
        <span className="font-mono text-[10px] text-muted">
          auto-refresh · 30m
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {EVENTS.map((ev) => {
          const { icon: Icon, color } = ICONS[ev.type];
          return (
            <div
              key={ev.id}
              className="fade-up flex items-start gap-3 rounded-xl border border-panel-border bg-white/[0.02] p-3"
            >
              <Icon size={15} className="mt-0.5 flex-shrink-0" style={{ color }} />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">
                  {ev.title}
                </p>
                <p className="text-[11px] text-muted">{ev.detail}</p>
              </div>
              <span className="font-mono text-[10px] text-muted">
                {ev.time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
