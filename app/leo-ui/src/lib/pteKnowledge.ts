"use client";

import { db, firebaseEnabled } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * LEO's PTE training knowledge base — the dashboard's "Brain" page.
 * Authored directly from the dashboard (unlike companyKnowledge, which
 * the bridge writes), then retrieved by tag/topic keyword overlap in the
 * bridge (retrievePteKnowledge() in index.js) — see
 * docs/leo-pte-trainer-plan.md §3 for why it's retrieval, not full-dump.
 */

export type PteKnowledgeEntry = {
  id: string;
  topic: string; // dotted path: "<skill>.<subtopic>.<aspect>"
  tags: string[];
  question?: string;
  content: string;
  priority: number; // 1-5
  addedAt?: number;
};

const COLLECTION = "pteKnowledge";

export function subscribePteKnowledge(cb: (entries: PteKnowledgeEntry[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("topic", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PteKnowledgeEntry, "id">) })));
    },
    () => cb([])
  );
}

export async function addPteKnowledgeEntry(entry: {
  topic: string;
  tags: string[];
  question?: string;
  content: string;
  priority: number;
}) {
  if (!firebaseEnabled || !db) return;
  await addDoc(collection(db, COLLECTION), {
    ...entry,
    question: entry.question?.trim() || null,
    addedAt: serverTimestamp(),
  });
}

export async function updatePteKnowledgeEntry(id: string, patch: Partial<PteKnowledgeEntry>) {
  if (!firebaseEnabled || !db) return;
  await updateDoc(doc(db, COLLECTION, id), patch);
}

export async function removePteKnowledgeEntry(id: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, id));
}

/** The skill is just the topic's first dotted segment — used purely for
 * grouping the Brain page's UI, not stored separately. */
export function skillOf(topic: string): string {
  return topic.split(".")[0] || "general";
}
