"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { subscribeActivity, ActivityEntry } from "@/lib/companyData";
import { firebaseEnabled } from "@/lib/firebase";

const ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  ok: { icon: CheckCircle2, color: "var(--accent-green)" },
  warn: { icon: AlertTriangle, color: "var(--accent-amber)" },
  pending: { icon: Clock, color: "var(--accent-cyan)" },
};

function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEntry[]>([]);

  useEffect(() => subscribeActivity(setEvents), []);

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Live activity
        </h2>
        <span className="font-mono text-[10px] text-muted">
          {firebaseEnabled ? "live" : "offline"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
            <Sparkles size={18} className="opacity-50" />
            <p className="text-xs">
              Nothing logged yet. As LEO does real things — links, replies,
              connector runs — they&apos;ll show up here.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const { icon: Icon, color } = ICONS[ev.type] ?? ICONS.ok;
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
                  {timeAgo(ev.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
