"use client";

import { db, firebaseEnabled } from "./firebase";
import { doc, onSnapshot, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

/**
 * Client side of LEO's WhatsApp link. The actual connection lives in a
 * separate always-on worker (services/whatsapp-bridge, deployed on
 * Railway) — this app never talks to WhatsApp directly. Instead:
 *
 *  - The bridge owns `whatsapp/status` (its live connection state + QR
 *    code when pairing) and writes it with the Firebase Admin SDK, which
 *    bypasses Firestore rules — so the client-side rules only need to
 *    allow reading it, never writing it.
 *  - This app requests actions (link/unlink) by adding a document to
 *    `whatsapp/commands`, which the bridge watches and executes. Firestore
 *    rules restrict who can create those to the developer role.
 *
 * That queue is the entire interface between the two processes — no
 * public HTTP endpoint on the bridge is needed.
 */

export type WhatsAppStatus = {
  status: "disconnected" | "connecting" | "qr" | "connected" | "error";
  qr?: string; // data URL
  phoneNumber?: string;
  connectedAt?: number;
  error?: string;
  updatedAt?: number;
};

const STATUS_DOC = "whatsapp/status";

export function subscribeWhatsAppStatus(cb: (status: WhatsAppStatus | null) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, STATUS_DOC),
    (snap) => cb(snap.exists() ? (snap.data() as WhatsAppStatus) : null),
    () => cb(null)
  );
}

export async function requestWhatsAppLink() {
  if (!firebaseEnabled || !db) return;
  await addDoc(collection(db, "whatsappCommands"), {
    type: "link",
    createdAt: serverTimestamp(),
  });
}

export async function requestWhatsAppUnlink() {
  if (!firebaseEnabled || !db) return;
  await addDoc(collection(db, "whatsappCommands"), {
    type: "unlink",
    createdAt: serverTimestamp(),
  });
}

/** Used once, by the bridge's own setup, to ensure the status doc exists —
 * harmless no-op from the client if it's already there. Not normally
 * called from the dashboard. */
export async function ensureWhatsAppStatusDoc() {
  if (!firebaseEnabled || !db) return;
  await setDoc(doc(db, STATUS_DOC), { status: "disconnected" }, { merge: true });
}
