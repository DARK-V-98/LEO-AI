"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Dashboard admins: emails granted access to sign into the LEO dashboard
 * itself (separate from `whatsappAdmins`, which grants admin commands on
 * WhatsApp). The developer role (src/lib/roles.ts) always has access and
 * can manage this list from DashboardAdminsPanel; everyone else needs an
 * entry here to get past AuthGate at all.
 */

export type DashboardAdmin = {
  email: string;
  label?: string;
  addedAt?: number;
};

const COLLECTION = "dashboardAdmins";

export function subscribeDashboardAdmins(cb: (admins: DashboardAdmin[]) => void): () => void {
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
          email: d.id,
          ...(d.data() as Omit<DashboardAdmin, "email">),
        }))
      );
    },
    () => cb([])
  );
}

export async function addDashboardAdmin(email: string, label?: string) {
  if (!firebaseEnabled || !db) return;
  const normalized = email.trim().toLowerCase();
  await setDoc(doc(db, COLLECTION, normalized), {
    label: label?.trim() || null,
    addedAt: serverTimestamp(),
  });
}

export async function removeDashboardAdmin(email: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, email.toLowerCase()));
}

/** One-shot check (not a subscription) for whether an email is in the
 * dashboard-admins list — used by useAuth to decide access. A signed-in
 * user is allowed to read their own entry by firestore.rules even if
 * they aren't a developer. */
export async function isDashboardAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email || !firebaseEnabled || !db) return false;
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, COLLECTION, email.toLowerCase()));
  return snap.exists();
}
