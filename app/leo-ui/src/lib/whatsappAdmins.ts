"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * WhatsApp admins: phone numbers granted admin-level actions on WhatsApp
 * (LMS student approvals, etc.) once LEO is opened up to students too —
 * most WhatsApp users should never be able to do those. The bridge worker
 * (Admin SDK) is the only thing that actually checks this list when
 * deciding whether to run an admin command; this is only how the
 * developer role grants/revokes it. Deliberately not grantable from
 * WhatsApp itself (see firestore.rules) — only from here.
 */

export type WhatsAppAdmin = {
  jid: string;
  phoneNumber: string;
  label?: string;
  addedAt?: number;
};

const COLLECTION = "whatsappAdmins";

/** Turns a plain phone number (with country code, digits only — e.g.
 * "94771234567") into the WhatsApp JID format the bridge actually
 * compares against. */
export function phoneToJid(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  return `${digits}@s.whatsapp.net`;
}

export function subscribeWhatsAppAdmins(cb: (admins: WhatsAppAdmin[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("addedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          jid: d.id,
          ...(d.data() as Omit<WhatsAppAdmin, "jid">),
        }))
      );
    },
    () => cb([])
  );
}

export async function addWhatsAppAdmin(phoneNumber: string, label?: string) {
  if (!firebaseEnabled || !db) return;
  const jid = phoneToJid(phoneNumber);
  await setDoc(doc(db, COLLECTION, jid), {
    phoneNumber: phoneNumber.replace(/[^0-9]/g, ""),
    label: label?.trim() || null,
    addedAt: serverTimestamp(),
  });
}

export async function removeWhatsAppAdmin(jid: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, jid));
}
