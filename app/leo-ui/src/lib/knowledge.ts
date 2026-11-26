"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

/** Facts LEO has been told to remember — seeded at startup (company
 * basics) plus anything someone explicitly asked it to remember since.
 * Written only by the bridge worker (Admin SDK); read-only here. */
export type KnowledgeFact = {
  id: string;
  fact: string;
  addedBy?: string;
  source?: string;
  createdAt: number;
};

export function subscribeKnowledge(cb: (facts: KnowledgeFact[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, "companyKnowledge"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeFact, "id">) })));
    },
    () => cb([])
  );
}
