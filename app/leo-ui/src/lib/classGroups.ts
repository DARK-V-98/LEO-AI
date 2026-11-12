"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Class groups: WhatsApp groups the developer has specifically marked as a
 * class, turning on essay/speaking scoring inside them. The bridge worker
 * (Admin SDK) is the only thing that actually checks this when deciding
 * whether a "Leo score this" command is allowed to run; this is only how
 * the developer role grants/revokes it — deliberately never settable from
 * WhatsApp itself, same reasoning as whatsappAdmins.
 */

export type ClassGroup = {
  jid: string;
  groupName?: string;
  className?: string;
  subject?: string;
  enabledAt?: number;
};

const COLLECTION = "classGroups";

export function subscribeClassGroups(cb: (groups: ClassGroup[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("enabledAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          jid: d.id,
          ...(d.data() as Omit<ClassGroup, "jid">),
        }))
      );
    },
    () => cb([])
  );
}

export async function setClassGroup(
  jid: string,
  fields: { groupName?: string; className?: string; subject?: string }
) {
  if (!firebaseEnabled || !db) return;
  await setDoc(
    doc(db, COLLECTION, jid),
    {
      groupName: fields.groupName || null,
      className: fields.className?.trim() || null,
      subject: fields.subject?.trim() || null,
      enabledAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removeClassGroup(jid: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, jid));
}
