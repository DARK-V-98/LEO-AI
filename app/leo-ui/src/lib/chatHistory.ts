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

export type StoredMessage = {
  id: string;
  from: "leo" | "user";
  text: string;
  createdAt: number;
};

/** Per-user chat history, persisted to Firestore at chats/{uid}/messages.
 * Falls back to an empty, non-persisted list if Firebase or a uid isn't
 * available yet — the chat still works, it just won't remember past this
 * page load. */
export function subscribeChatHistory(
  uid: string | null,
  cb: (messages: StoredMessage[]) => void,
  max = 100
): () => void {
  if (!firebaseEnabled || !db || !uid) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(db, "chats", uid, "messages"),
    orderBy("createdAt", "asc"),
    fsLimit(max)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StoredMessage, "id">) })));
    },
    () => cb([])
  );
}

export async function appendChatMessage(
  uid: string | null,
  from: "leo" | "user",
  text: string
) {
  if (!firebaseEnabled || !db || !uid) return;
  try {
    await addDoc(collection(db, "chats", uid, "messages"), {
      from,
      text,
      createdAt: Date.now(),
    });
  } catch {
    /* non-critical — the message still shows in this session's UI */
  }
}
