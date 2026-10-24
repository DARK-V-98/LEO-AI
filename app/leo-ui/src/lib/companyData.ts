"use client";

import { db, firebaseEnabled } from "./firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit as fsLimit,
  addDoc,
} from "firebase/firestore";
import type { ListItem } from "@/components/ListPanel";

/**
 * Real (not mocked) company data collections. Every one of these starts
 * empty until a real connector (Meta Ads, the LMS, an SEO crawler, etc.)
 * actually writes to it — callers are expected to render an honest empty
 * state rather than fabricated demo rows. If Firebase isn't configured in
 * this environment, every subscribe below just yields [] instead of
 * throwing, so the UI still renders sensibly.
 */

function subscribeList(
  path: string,
  cb: (items: ListItem[]) => void,
  max = 50
): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, path), orderBy("createdAt", "desc"), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ListItem, "id">),
        }))
      );
    },
    () => cb([])
  );
}

export const subscribeTasks = (cb: (items: ListItem[]) => void) => subscribeList("tasks", cb);
export const subscribeLeads = (cb: (items: ListItem[]) => void) => subscribeList("leads", cb);
export const subscribeAdSuggestions = (cb: (items: ListItem[]) => void) =>
  subscribeList("adSuggestions", cb);
export const subscribeSeoIssues = (cb: (items: ListItem[]) => void) =>
  subscribeList("seoIssues", cb);
export const subscribeEvents = (cb: (items: ListItem[]) => void) => subscribeList("events", cb);

// --- Activity log -----------------------------------------------------

export type ActivityType = "ok" | "warn" | "pending";
export type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
  type: ActivityType;
  createdAt: number;
};

export function subscribeActivity(cb: (items: ActivityEntry[]) => void, max = 30): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, "activity"), orderBy("createdAt", "desc"), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityEntry, "id">),
        }))
      );
    },
    () => cb([])
  );
}

export async function logActivity(title: string, detail: string, type: ActivityType = "ok") {
  if (!firebaseEnabled || !db) return;
  try {
    await addDoc(collection(db, "activity"), { title, detail, type, createdAt: Date.now() });
  } catch {
    /* non-critical — losing one activity log entry shouldn't break the UI */
  }
}
