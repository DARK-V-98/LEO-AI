"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, onSnapshot, orderBy, query, limit as fsLimit } from "firebase/firestore";

export type WhatsAppChatSummary = {
  id: string; // the WhatsApp JID
  jid: string;
  isGroup: boolean;
  lastMessageAt: number;
  lastMessageText: string;
  lastMessageRole: "user" | "assistant";
};

export type WhatsAppChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

/** Developer-only: every WhatsApp DM and group chat LEO is part of.
 * Firestore rules restrict reads here to the developer role already —
 * this is real people's private conversations, not general company data. */
export function subscribeWhatsAppChatList(
  cb: (chats: WhatsAppChatSummary[]) => void,
  max = 100
): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, "whatsappChats"), orderBy("lastMessageAt", "desc"), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WhatsAppChatSummary, "id">),
        }))
      );
    },
    () => cb([])
  );
}

export function subscribeWhatsAppChatMessages(
  jid: string,
  cb: (messages: WhatsAppChatMessage[]) => void,
  max = 200
): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(db, "whatsappChats", jid, "messages"),
    orderBy("createdAt", "asc"),
    fsLimit(max)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WhatsAppChatMessage, "id">) })));
    },
    () => cb([])
  );
}
