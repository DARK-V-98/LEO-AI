import type { PteKnowledgeEntry } from "./pteKnowledge";

/**
 * Tag/topic keyword-overlap retrieval — a TypeScript port of
 * retrievePteKnowledge()/formatKnowledgeForPrompt() in
 * services/whatsapp-bridge/index.js, used by the dashboard's own "Ask
 * LEO" chat (ChatPanel, Trainer mode) so testing from the dashboard goes
 * through the same retrieval the real WhatsApp trainer conversations do,
 * not a different code path. Keep the scoring logic in sync between the
 * two if either changes.
 */

function wordsOf(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2)
  );
}

export function retrievePteKnowledgeEntries(
  entries: PteKnowledgeEntry[],
  queryText: string,
  maxEntries = 4
): PteKnowledgeEntry[] {
  const words = wordsOf(queryText);
  if (words.size === 0 || entries.length === 0) return [];

  const scored = entries
    .map((entry) => {
      let score = 0;
      for (const tag of entry.tags || []) {
        if (words.has(String(tag).toLowerCase())) score += 2;
      }
      for (const seg of String(entry.topic || "").split(".")) {
        if (words.has(seg.toLowerCase())) score += 1;
      }
      return { entry, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.entry.priority ?? 0) - (a.entry.priority ?? 0));

  return scored.slice(0, maxEntries).map((s) => s.entry);
}

export function formatPteKnowledgeForPrompt(entries: PteKnowledgeEntry[]): string {
  if (entries.length === 0) return "";
  const blocks = entries.map((e) => `[${e.topic}]\n${e.content}`).join("\n\n");
  return `Relevant PTE training notes for this message (use them, don't just repeat them verbatim):\n\n${blocks}`;
}
