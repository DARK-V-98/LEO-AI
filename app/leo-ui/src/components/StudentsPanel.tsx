"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Lock, UserPlus, Trash2, Clock } from "lucide-react";
import { subscribeStudents, addStudent, removeStudent, Student } from "@/lib/students";
import { firebaseEnabled } from "@/lib/firebase";

export default function StudentsPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState(""); // <input type="datetime-local"> value
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeStudents(setStudents), []);

  async function handleAdd() {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 8) {
      setError("Enter the full number with country code, e.g. 94771234567.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
      await addStudent(digits, name, expiresMs);
      setPhone("");
      setName("");
      setExpiresAt("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
            <GraduationCap size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Students</h2>
            <p className="text-[11px] text-muted">
              Only these numbers (plus anyone in a marked class group) get replies from LEO in a DM
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-accent-green/40 px-2 py-0.5 text-[10px] text-accent-green">
          <Lock size={10} />
          Developer only
        </span>
      </div>

      {!firebaseEnabled ? (
        <p className="text-xs text-muted">Firebase isn&apos;t configured here.</p>
      ) : (
        <>
          <p className="text-[11px] text-muted">
            Every other number — anyone not added here and not inside a
            marked class group — is silently ignored by LEO, no reply at
            all. Set an expiry if this student&apos;s access should end on
            a specific date (e.g. the end of a course) — LEO sends one
            final notice when it lapses, then goes quiet for them too.
          </p>

          <div className="flex flex-col gap-2 rounded-xl border border-panel-border bg-black/[0.03] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted">
                  Phone number (with country code, digits only)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="94771234567"
                  className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-green/60"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted">Name (optional)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nimasha"
                  className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-green/60"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] text-muted">Expires at (optional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-green/60"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !phone}
                className="flex items-center gap-1.5 rounded-lg bg-accent-green/15 px-3 py-1.5 text-xs font-medium text-accent-green hover:bg-accent-green/25 disabled:opacity-50"
              >
                <UserPlus size={13} />
                {adding ? "Adding…" : "Add student"}
              </button>
            </div>
          </div>
          {error ? <p className="text-[11px] text-accent-magenta">{error}</p> : null}

          <div className="flex flex-col gap-1.5">
            {students.length === 0 ? (
              <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
                No students added yet — only marked class groups can reach LEO until you add one.
              </p>
            ) : (
              students.map((s) => {
                const expired = Boolean(s.expiresAt && s.expiresAt < Date.now());
                return (
                  <div
                    key={s.phoneNumber}
                    className="flex items-center justify-between rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        +{s.phoneNumber}
                        {s.name ? ` — ${s.name}` : ""}
                      </p>
                      {s.expiresAt ? (
                        <p
                          className={`flex items-center gap-1 text-[11px] ${expired ? "text-accent-magenta" : "text-muted"}`}
                        >
                          <Clock size={10} />
                          {expired ? "Expired " : "Expires "}
                          {new Date(s.expiresAt).toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted">No expiry</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeStudent(s.phoneNumber)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-accent-magenta hover:bg-accent-magenta/10"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
