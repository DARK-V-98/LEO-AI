"use client";

import type { User } from "firebase/auth";
import { LogOut, ShieldCheck, Mail, Clock } from "lucide-react";
import { DEVELOPER_EMAILS } from "@/lib/roles";

export default function SettingsPanel({
  user,
  isDeveloper,
  onSignOut,
}: {
  user: User | null;
  isDeveloper: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="glass-panel rounded-2xl p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Your account</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
              <Mail size={15} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{user?.email ?? "—"}</p>
              <p className="text-[11px] text-muted">Signed in as</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
              <ShieldCheck size={15} />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">
                {isDeveloper ? "Developer" : "Admin"}
              </p>
              <p className="text-[11px] text-muted">
                {isDeveloper
                  ? "Full access, including managing other admins"
                  : "Added by the developer via Users & Access"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="mt-4 flex items-center gap-2 rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-accent-magenta transition-colors hover:bg-accent-magenta/10"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Data &amp; retention</h2>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-amber/10 text-accent-amber">
            <Clock size={15} />
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Every WhatsApp conversation (including every student&apos;s own
            chat) is kept for <span className="text-foreground">30 days</span>,
            then automatically deleted by the bridge worker. This is set in
            code (<code className="rounded bg-black/[0.05] px-1">CHAT_RETENTION_DAYS</code> in
            the bridge), not changeable from here.
          </p>
        </div>
      </div>

      {isDeveloper ? (
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Developer access</h2>
          <p className="text-xs leading-relaxed text-muted">
            Hardcoded in <code className="rounded bg-black/[0.05] px-1">src/lib/roles.ts</code>,
            not stored in Firestore — this account always has full access
            regardless of the Users &amp; Access admin list:
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {DEVELOPER_EMAILS.map((email) => (
              <li key={email} className="font-mono text-[11px] text-foreground">
                {email}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
