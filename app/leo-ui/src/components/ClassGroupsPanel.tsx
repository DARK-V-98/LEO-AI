"use client";

import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Lock, Check, X } from "lucide-react";
import { subscribeWhatsAppChatList, WhatsAppChatSummary } from "@/lib/whatsappChats";
import { subscribeClassGroups, setClassGroup, removeClassGroup, ClassGroup } from "@/lib/classGroups";
import { firebaseEnabled } from "@/lib/firebase";

export default function ClassGroupsPanel() {
  const [chats, setChats] = useState<WhatsAppChatSummary[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [editingJid, setEditingJid] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeWhatsAppChatList(setChats, 200), []);
  useEffect(() => subscribeClassGroups(setClassGroups), []);

  const groups = useMemo(() => chats.filter((c) => c.isGroup), [chats]);
  const classGroupByJid = useMemo(() => new Map(classGroups.map((g) => [g.jid, g])), [classGroups]);

  function startEditing(g: WhatsAppChatSummary) {
    setEditingJid(g.id);
    setClassName("");
    setSubject("");
  }

  async function confirmEnable(g: WhatsAppChatSummary) {
    setSaving(true);
    try {
      await setClassGroup(g.id, {
        groupName: g.groupName,
        className,
        subject,
      });
      setEditingJid(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-violet/10 text-accent-violet">
            <GraduationCap size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Class groups</h2>
            <p className="text-[11px] text-muted">
              Mark a WhatsApp group as a class to turn on essay/speaking scoring inside it
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
            Only groups marked here will respond to &quot;Leo score this essay&quot; — everywhere
            else, that command is simply not recognized. This can only be set from here, never
            from WhatsApp itself.
          </p>

          <div className="flex flex-col gap-1.5">
            {groups.length === 0 ? (
              <p className="rounded-lg border border-panel-border bg-white/[0.02] p-3 text-center text-xs text-muted">
                No WhatsApp groups seen yet — LEO needs to have received at least one message in a
                group before it shows up here.
              </p>
            ) : (
              groups.map((g) => {
                const enabled = classGroupByJid.get(g.id);
                const displayName = g.groupName || g.id;
                const isEditing = editingJid === g.id;

                return (
                  <div
                    key={g.id}
                    className="flex flex-col gap-2 rounded-lg border border-panel-border bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
                        {enabled ? (
                          <p className="truncate text-[11px] text-muted">
                            {[enabled.className, enabled.subject].filter(Boolean).join(" • ") || "Class group"}
                          </p>
                        ) : null}
                      </div>
                      {enabled ? (
                        <button
                          onClick={() => removeClassGroup(g.id)}
                          className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-accent-magenta hover:bg-accent-magenta/10"
                        >
                          Disable
                        </button>
                      ) : isEditing ? null : (
                        <button
                          onClick={() => startEditing(g)}
                          className="shrink-0 rounded-lg bg-accent-violet/15 px-2 py-1 text-[11px] font-medium text-accent-violet hover:bg-accent-violet/25"
                        >
                          Mark as class
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-2 border-t border-panel-border pt-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] text-muted">
                            Class name (optional)
                          </label>
                          <input
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="e.g. PTE Evening Batch"
                            className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-violet/60"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-[10px] text-muted">
                            Subject (optional)
                          </label>
                          <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. PTE Academic"
                            className="w-full rounded-lg border border-panel-border bg-transparent px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent-violet/60"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => confirmEnable(g)}
                            disabled={saving}
                            className="flex items-center gap-1 rounded-lg bg-accent-violet/15 px-2.5 py-1.5 text-[11px] font-medium text-accent-violet hover:bg-accent-violet/25 disabled:opacity-50"
                          >
                            <Check size={12} />
                            {saving ? "Saving…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setEditingJid(null)}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] text-muted hover:bg-white/[0.04]"
                          >
                            <X size={12} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
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
