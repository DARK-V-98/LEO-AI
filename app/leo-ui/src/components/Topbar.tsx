"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Wifi, Languages, LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import LeoOrb from "./LeoOrb";
import { VoiceLang } from "@/hooks/useWakeWord";

function initialsFor(user: User | null): string {
  const source = user?.displayName || user?.email || "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function Topbar({
  voiceLang,
  onVoiceLangChange,
  user,
  onSignOut,
  connectorsActive,
}: {
  voiceLang: VoiceLang;
  onVoiceLangChange: (lang: VoiceLang) => void;
  user: User | null;
  onSignOut: () => void;
  connectorsActive: number;
}) {
  const [time, setTime] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="glass-panel flex items-center justify-between rounded-2xl px-5 py-3">
      <div className="flex items-center gap-4">
        <LeoOrb size={40} mood="idle" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">
              NeuraLink Operator
            </h1>
            <span className="rounded-full border border-accent-green/40 bg-accent-green/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-accent-green">
              REAL AI MODE
            </span>
          </div>
          <p className="font-mono text-[11px] text-muted">
            SYS::ONLINE &nbsp;|&nbsp; NEURALINK_ENGINE::ACTIVE &nbsp;|&nbsp;{" "}
            {time}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-xl border border-panel-border px-3 py-1.5 text-xs text-muted md:flex">
          <Wifi size={14} className={connectorsActive > 0 ? "text-accent-green" : "text-muted"} />
          {connectorsActive} connector{connectorsActive === 1 ? "" : "s"} active
        </div>

        <div
          className="flex items-center gap-1 rounded-xl border border-panel-border p-1 text-xs"
          title="Voice input language (speak and he'll reply in the same one, too)"
        >
          <Languages size={13} className="ml-1 text-muted" />
          <button
            onClick={() => onVoiceLangChange("en-US")}
            className={`rounded-lg px-2 py-1 transition-colors ${
              voiceLang === "en-US"
                ? "bg-accent-cyan/15 text-accent-cyan"
                : "text-muted hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onVoiceLangChange("si-LK")}
            className={`rounded-lg px-2 py-1 transition-colors ${
              voiceLang === "si-LK"
                ? "bg-accent-cyan/15 text-accent-cyan"
                : "text-muted hover:text-foreground"
            }`}
          >
            සිං
          </button>
        </div>

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-panel-border px-2 py-1.5 pr-3 text-sm text-foreground transition-colors hover:bg-white/5"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background:
                  "linear-gradient(135deg, var(--accent-violet), var(--accent-magenta))",
              }}
            >
              {initialsFor(user)}
            </div>
            <span className="hidden max-w-[120px] truncate text-xs sm:inline">
              {user?.displayName || user?.email || "Signed in"}
            </span>
            <ChevronDown size={14} className="text-muted" />
          </button>

          {menuOpen ? (
            <div className="glass-panel fade-up absolute right-0 top-full z-30 mt-2 w-48 rounded-xl p-1.5">
              <div className="px-2 py-1.5 text-[11px] text-muted truncate">
                {user?.email}
              </div>
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
    </header>
  );
}
