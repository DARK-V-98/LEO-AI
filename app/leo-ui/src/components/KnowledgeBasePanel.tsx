"use client";

import { useEffect, useState } from "react";
import { BookOpen, User } from "lucide-react";
import { subscribeKnowledge, KnowledgeFact } from "@/lib/knowledge";

/** Read-only view of what LEO actually knows — facts seeded at startup
 * plus anything someone asked it to remember since, straight from
 * Firestore. There's no add/edit UI here yet; new facts come from a
 * "remember that ..." chat message or the seed script, same as today. */
export default function KnowledgeBasePanel() {
  const [facts, setFacts] = useState<KnowledgeFact[]>([]);

  useEffect(() => subscribeKnowledge(setFacts), []);

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
            <BookOpen size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Knowledge base</h2>
            <p className="text-[11px] text-muted">
              {facts.length} fact{facts.length === 1 ? "" : "s"} LEO currently knows
            </p>
          </div>
        </div>
      </div>

      {facts.length === 0 ? (
        <p className="rounded-lg border border-panel-border bg-black/[0.03] p-3 text-center text-xs text-muted">
          Nothing here yet — LEO learns company facts from its startup seed,
          and anything someone asks it to remember in chat.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {facts.map((f) => (
            <div
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-panel-border bg-black/[0.03] px-3 py-2"
            >
              <p className="text-xs text-foreground">{f.fact}</p>
              <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap text-[10px] text-muted">
                <User size={10} />
                {f.addedBy ?? f.source ?? "system"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
