"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronDown, Wifi } from "lucide-react";
import LeoOrb from "./LeoOrb";

export default function Topbar() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
          <Wifi size={14} className="text-accent-cyan" />
          4 connectors active
        </div>

        <button className="relative rounded-xl border border-panel-border p-2 text-muted transition-colors hover:text-foreground">
          <Bell size={16} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-magenta text-[9px] font-bold text-white">
            6
          </span>
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-panel-border px-2 py-1.5 pr-3 text-sm text-foreground transition-colors hover:bg-white/5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-violet), var(--accent-magenta))",
            }}
          >
            TV
          </div>
          <span className="hidden text-xs sm:inline">Thimira</span>
          <ChevronDown size={14} className="text-muted" />
        </button>
      </div>
    </header>
  );
}
