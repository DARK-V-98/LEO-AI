"use client";

import { useEffect, useState } from "react";
import { ShieldHalf, Lock, UserPlus, Trash2 } from "lucide-react";
import {
  subscribeWhatsAppAdmins,
  addWhatsAppAdmin,
  removeWhatsAppAdmin,
  WhatsAppAdmin,
} from "@/lib/whatsappAdmins";
import { firebaseEnabled } from "@/lib/firebase";

export default function WhatsAppAdminsPanel() {
  const [admins, setAdmins] = useState<WhatsAppAdmin[]>([]);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeWhatsAppAdmins(setAdmins), []);

  async function handleAdd() {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 8) {
      setError("Enter the full number with country code, e.g. 94771234567.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await addWhatsAppAdmin(digits, label);
      setPhone("");
      setLabel("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-amber/10 text-accent-amber">
            <ShieldHalf size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">WhatsApp admins</h2>
            <p className="text-[11px] text-muted">
              Numbers that can run admin commands on WhatsApp (LMS approvals, etc.)
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-accent-amber/40 px-2 py-0.5 text-[10px] text-accent-amber">
          <Lock size={10} />
          Developer only
        </span>
      </div>

      {!firebaseEnabled ? (
        <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
      ) : (
        <>
          <p className="text-[11px] text-muted">
            Only numbers added here can use admin-only WhatsApp commands (like
            approving/rejecting a student) — everyone else, students
            included, gets a clear &quot;you don&apos;t have access&quot;
            instead. This can only be granted from here, never from
            WhatsApp itself.
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-panel-border bg-white/[0.02] p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">
                Phone number (with country code, digits only)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="94771234567"
                className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-amber/60"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] text-muted">Label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Admissions officer"
                className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-amber/60"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !phone}
              className="flex items-center gap-1.5 rounded-lg bg-accent-amber/15 px-3 py-1.5 text-xs font-medium text-accent-amber hover:bg-accent-amber/25 disabled:opacity-50"
            >
              <UserPlus size={13} />
              {adding ? "Adding…" : "Grant admin"}
            </button>
          </div>
          {error ? <p className="text-[11px] text-accent-magenta">{error}</p> : null}

          <div className="flex flex-col gap-1.5">
            {admins.length === 0 ? (
              <p className="rounded-lg border border-panel-border bg-white/[0.02] p-3 text-center text-xs text-muted">
                No WhatsApp admins yet — nobody can run admin commands there until you add one.
              </p>
            ) : (
              admins.map((a) => (
                <div
                  key={a.jid}
                  className="flex items-center justify-between rounded-lg border border-panel-border bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-foreground">+{a.phoneNumber}</p>
                    {a.label ? <p className="text-[11px] text-muted">{a.label}</p> : null}
                  </div>
                  <button
                    onClick={() => removeWhatsAppAdmin(a.jid)}
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
