"use client";

import { LucideIcon, Inbox } from "lucide-react";

export type ListItem = {
  id: string | number;
  title: string;
  subtitle: string;
  meta?: string;
  accent?: "cyan" | "violet" | "magenta" | "green" | "amber";
};

export default function ListPanel({
  title,
  subtitle,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: ListItem[];
  emptyMessage?: string;
}) {
  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
          <Icon size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-[11px] text-muted">{subtitle}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted">
            <Inbox size={18} className="opacity-50" />
            <p className="text-xs">
              {emptyMessage ?? "Nothing here yet."}
            </p>
          </div>
        ) : null}
        {items.map((item) => {
          const accentVar = `var(--accent-${item.accent ?? "cyan"})`;
          return (
            <div
              key={item.id}
              className="fade-up flex items-center justify-between rounded-xl border border-panel-border bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-[12px] text-muted">{item.subtitle}</p>
              </div>
              {item.meta ? (
                <span
                  className="font-mono text-[11px]"
                  style={{ color: accentVar }}
                >
                  {item.meta}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
