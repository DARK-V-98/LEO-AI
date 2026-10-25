"use client";

import { db, firebaseEnabled } from "./firebase";
import { doc, onSnapshot, addDoc, collection, serverTimestamp } from "firebase/firestore";

/**
 * Client side of the LMS connection check. Only the WhatsApp bridge (on
 * Railway) actually holds LMS_BASE_URL/LMS_API_KEY, so the website can't
 * test this itself — same pattern as the WhatsApp link status: this app
 * writes a "please check" request, the bridge does the real work and
 * writes the result, this app just reads it.
 */

export type LmsStatus = {
  ok: boolean;
  message: string;
  detail?: string;
  checkedAt?: number;
};

export function subscribeLmsStatus(cb: (status: LmsStatus | null) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, "lms/status"),
    (snap) => cb(snap.exists() ? (snap.data() as LmsStatus) : null),
    () => cb(null)
  );
}

export async function requestLmsCheck() {
  if (!firebaseEnabled || !db) return;
  await addDoc(collection(db, "lmsCheckRequests"), {
    createdAt: serverTimestamp(),
  });
}
