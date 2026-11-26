"use client";

import { useEffect, useState } from "react";
import { UserCog, Lock, UserPlus, Trash2 } from "lucide-react";
import {
  subscribeDashboardAdmins,
  addDashboardAdmin,
  removeDashboardAdmin,
  DashboardAdmin,
} from "@/lib/dashboardAdmins";
import { firebaseEnabled } from "@/lib/firebase";

export default function DashboardAdminsPanel() {
  const [admins, setAdmins] = useState<DashboardAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeDashboardAdmins(setAdmins), []);

  async function handleAdd() {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@") || !normalized.includes(".")) {
      setError("Enter a full email address, e.g. name@smartlabs.com.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await addDashboardAdmin(normalized, label);
      setEmail("");
      setLabel("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
            <UserCog size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Dashboard admins</h2>
            <p className="text-[11px] text-muted">
              Google accounts (by email) allowed to sign into this dashboard
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-accent-violet/40 px-2 py-0.5 text-[10px] text-accent-violet">
          <Lock size={10} />
          Developer only
        </span>
      </div>

      {!firebaseEnabled ? (
        <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
      ) : (
        <>
          <p className="text-[11px] text-muted">
            Anyone can click &quot;Sign in with Google&quot;, but only the
            developer account and the emails listed here are actually let
            in — everyone else sees a clear &quot;access restricted&quot;
            screen instead of the dashboard. Add admins here once; they
            don&apos;t need to be re-added if they sign out and back in.
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-panel-border bg-black/[0.03] p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@smartlabs.com"
                className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-violet/60"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">Label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Operations lead"
                className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-violet/60"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !email}
              className="flex items-center gap-1.5 rounded-lg bg-accent-violet/15 px-3 py-1.5 text-xs font-medium text-accent-violet hover:bg-accent-violet/25 disabled:opacity-50"
            >
              <UserPlus size={13} />
              {adding ? "Adding…" : "Grant access"}
            </button>
          </div>
          {error ? <p className="text-[11px] text-accent-magenta">{error}</p> : null}

          <div className="flex flex-col gap-1.5">
            {admins.length === 0 ? (
              <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
                No admins added yet — only the developer account can sign in until you add one.
              </p>
            ) : (
              admins.map((a) => (
                <div
                  key={a.email}
                  className="flex items-center justify-between rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">{a.email}</p>
                    {a.label ? <p className="text-[11px] text-muted">{a.label}</p> : null}
                  </div>
                  <button
                    onClick={() => removeDashboardAdmin(a.email)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-accent-magenta hover:bg-accent-magenta/10"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
