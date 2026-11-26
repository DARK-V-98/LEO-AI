"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import type { User } from "firebase/auth";
import { subscribeActivity, ActivityEntry } from "@/lib/companyData";

function initialsFor(user: User | null): string {
  const source = user?.displayName || user?.email || "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Shared page title + notifications + account menu, used at the top of
 * every page except Dashboard (which has its own richer greeting header). */
export default function PageHeader({
  title,
  subtitle,
  user,
  isDeveloper,
  onSignOut,
  onOpenMobileNav,
}: {
  title: string;
  subtitle?: string;
  user: User | null;
  isDeveloper: boolean;
  onSignOut: () => void;
  onOpenMobileNav?: () => void;
}) {
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeActivity(setRecentActivity, 5), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const hasRecentActivity = recentActivity.some((a) => Date.now() - a.createdAt < 86_400_000);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {onOpenMobileNav ? (
          <button
            onClick={onOpenMobileNav}
            className="glass-panel flex h-9 w-9 items-center justify-center rounded-xl text-muted lg:hidden"
          >
            <Menu size={16} />
          </button>
        ) : null}
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-panel-border text-muted">
          <Bell size={15} />
          {hasRecentActivity ? (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-cyan" />
          ) : null}
        </div>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-panel-border px-2 py-1.5 pr-3 text-sm text-foreground transition-colors hover:bg-black/[0.05]"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent-violet), var(--accent-magenta))" }}
            >
              {initialsFor(user)}
            </div>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="max-w-[140px] truncate text-xs font-medium">
                {user?.displayName || user?.email || "Signed in"}
              </span>
              <span className="text-[10px] text-muted">{isDeveloper ? "Developer" : "Admin"}</span>
            </span>
            <ChevronDown size={14} className="text-muted" />
          </button>

          {menuOpen ? (
            <div className="glass-panel fade-up absolute right-0 top-full z-30 mt-2 w-48 rounded-xl p-1.5">
              <div className="px-2 py-1.5 text-[11px] text-muted truncate">{user?.email}</div>
              <button
                onClick={onSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-accent-magenta transition-colors hover:bg-accent-magenta/10"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
