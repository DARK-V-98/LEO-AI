"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Students — the closed-classroom allowlist. Only a phone number in here
 * (and not expired) gets a reply from LEO in a DM; a WhatsApp group still
 * needs to be separately marked in classGroups (see ClassGroupsPanel).
 * Same add/remove pattern as whatsappAdmins.ts, plus an optional expiry.
 */

export type Student = {
  phoneNumber: string;
  name?: string;
  expiresAt?: number | null;
  expiryNoticeSent?: boolean;
  addedAt?: number;
};

const COLLECTION = "students";

export function subscribeStudents(cb: (students: Student[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("addedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as Student));
    },
    () => cb([])
  );
}

export async function addStudent(phoneNumber: string, name?: string, expiresAt?: number | null) {
  if (!firebaseEnabled || !db) return;
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  await setDoc(doc(db, COLLECTION, digits), {
    phoneNumber: digits,
    name: name?.trim() || null,
    expiresAt: expiresAt ?? null,
    expiryNoticeSent: false,
    addedAt: serverTimestamp(),
  });
}

export async function removeStudent(phoneNumber: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, phoneNumber.replace(/[^0-9]/g, "")));
}
