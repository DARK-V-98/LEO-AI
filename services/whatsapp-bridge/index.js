import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import admin from "firebase-admin";
import pino from "pino";
import QRCode from "qrcode";
import fs from "fs";
import * as chrono from "chrono-node";

// --- Firebase Admin ------------------------------------------------------
// Paste the full service account JSON (Firebase console -> Project
// settings -> Service accounts -> Generate new private key) into the
// FIREBASE_SERVICE_ACCOUNT env var as a single-line string. This process
// needs the Admin SDK (not the web client config) because it writes
// whatsapp/status directly, bypassing Firestore security rules — that's
// intentional: only this trusted worker should be able to set "connected".
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error(
    "Missing FIREBASE_SERVICE_ACCOUNT env var — paste the service account JSON (as one line) before starting."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

const STATUS_DOC = db.collection("whatsapp").doc("status");
const COMMANDS = db.collection("whatsappCommands");
const OUTBOX = db.collection("whatsappOutbox");
const SCHEDULED = db.collection("scheduledMessages");
const KNOWLEDGE = db.collection("companyKnowledge");
const PEOPLE = db.collection("people");
const LEADS = db.collection("leads");
const TASKS = db.collection("tasks");

// Optional: a WhatsApp JID (a number like "94771234567@s.whatsapp.net") to
// send a once-a-day summary of new leads/tasks to. Unset by default — the
// digest is simply skipped until someone opts in by setting this.
const DAILY_DIGEST_JID = process.env.DAILY_DIGEST_JID || null;

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info";
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

// Where the LLM actually lives — the same /api/chat route the website's
// chat tab uses. This worker has no AI of its own, it just relays to it.
const WEB_BASE_URL = process.env.LEO_WEB_BASE_URL;
if (!WEB_BASE_URL) {
  console.warn(
    "LEO_WEB_BASE_URL is not set — incoming WhatsApp messages will be ignored until it is (should be your Vercel site's URL, e.g. https://leo-ai-leo-ui.vercel.app)."
  );
}

// Who gets a reply to *every* message vs. only when addressed by name.
// DMs: LEO is the only recipient, so anything sent to him is for him.
// Groups: only reply when "Leo" is actually said, same rule as voice —
// otherwise he'd answer every single message in the company group.
const MENTION_PATTERN = /\bleo\b/i;

let sock = null;
let starting = false;
// idle | connecting | open — guards against ever having two live sockets
// authenticated with the same session at once, which WhatsApp treats as a
// conflict and kicks both off repeatedly (error 440, "connectionReplaced"
// in a tight loop). That happens if startSock() gets called twice before
// the first connection finishes — e.g. the auto-reconnect-on-boot path and
// a leftover unprocessed "link" command both firing at startup.
let socketState = "idle";

// Every message either side sends is kept permanently — not just an
// in-memory cache that forgets on restart. Each chat (a DM's JID, or a
// group's JID) gets its own Firestore subcollection, so one person's DM
// history is never readable from, or mixed into, anyone else's chat — a
// group's history is naturally shared with that group already, same as
// WhatsApp itself.
function chatMessagesRef(jid) {
  return db.collection("whatsappChats").doc(jid).collection("messages");
}

const chatMemory = new Map();
const HISTORY_FOR_AI = 20; // how much recent context to actually send the model

function remember(jid, role, content) {
  const history = chatMemory.get(jid) ?? [];
  history.push({ role, content });
  while (history.length > HISTORY_FOR_AI) history.shift();
  chatMemory.set(jid, history);

  chatMessagesRef(jid)
    .add({ role, content, createdAt: Date.now() })
    .catch((err) => console.error(`Failed to persist message for ${jid}:`, err));

  // Keeps a lightweight, queryable list of "which chats exist" for the
  // admin dashboard — without this, whatsappChats/{jid} documents would
  // only exist as a path implied by their messages subcollection, which
  // Firestore can't list directly.
  db.collection("whatsappChats")
    .doc(jid)
    .set(
      {
        jid,
        isGroup: jid.endsWith("@g.us"),
        lastMessageAt: Date.now(),
        lastMessageText: content.slice(0, 120),
        lastMessageRole: role,
      },
      { merge: true }
    )
    .catch((err) => console.error(`Failed to update chat summary for ${jid}:`, err));
}

/** On the first message from a JID since this process started, pull its
 * recent history back from Firestore so context survives a restart. */
async function ensureHistoryLoaded(jid) {
  if (chatMemory.has(jid)) return;
  try {
    const snap = await chatMessagesRef(jid)
      .orderBy("createdAt", "desc")
      .limit(HISTORY_FOR_AI)
      .get();
    const history = snap.docs
      .map((d) => {
        const data = d.data();
        return { role: data.role, content: data.content };
      })
      .reverse();
    chatMemory.set(jid, history);
  } catch (err) {
    console.error(`Failed to load history for ${jid}:`, err);
    chatMemory.set(jid, []);
  }
}

// --- Company knowledge & people memory -------------------------------------
// Deliberately conservative about what gets remembered: only (a) facts
// someone explicitly asks LEO to remember, and (b) a person's own name/role
// when they introduce themselves — never arbitrary message content from a
// private chat. Company facts are shared across every chat (they're not
// private); a person's name/role is only ever surfaced back to that same
// person, never mentioned to anyone else.

const SEED_KNOWLEDGE = [
  "SmartLabs is an educational institute.",
  "Ms. Lahiruka is the Managing Director and owner of SmartLabs.",
  "Vishwa is the software engineer and developer who built SmartLabs' AI (LEO himself), websites, and systems.",
];

async function seedKnowledgeIfEmpty() {
  try {
    const snap = await KNOWLEDGE.limit(1).get();
    if (!snap.empty) return;
    const batch = db.batch();
    for (const fact of SEED_KNOWLEDGE) {
      batch.set(KNOWLEDGE.doc(), { fact, addedBy: "system", source: "seed", createdAt: Date.now() });
    }
    await batch.commit();
    console.log("Seeded initial company knowledge.");
  } catch (err) {
    console.error("Failed to seed company knowledge:", err);
  }
}

async function getCompanyContext(senderJid) {
  const lines = [];
  try {
    const knowledgeSnap = await KNOWLEDGE.get();
    const facts = knowledgeSnap.docs.map((d) => d.data().fact).filter(Boolean);
    if (facts.length > 0) {
      lines.push("Company facts you already know (don't ask to be told these again):");
      for (const f of facts) lines.push(`- ${f}`);
    }

    const personDoc = await PEOPLE.doc(senderJid).get();
    if (personDoc.exists) {
      const p = personDoc.data();
      lines.push(
        `\nYou're talking to ${p.name}${p.role ? `, ${p.role}` : ""}. Address them by name naturally, don't re-ask who they are.`
      );
    }
  } catch (err) {
    console.error("Failed to load company context:", err);
  }
  return lines.join("\n");
}

// "remember [that] <fact>" / "remember: <fact>" — an explicit, deliberate
// way to teach LEO something, rather than guessing at what's worth keeping.
const REMEMBER_PATTERN = /^\s*remember\s*(?:that)?\s*[:\-]?\s*(.+)/i;

async function rememberFact(fact, addedBy, source) {
  await KNOWLEDGE.add({ fact, addedBy, source, createdAt: Date.now() });
}

// Makes the memory system feel safe to rely on instead of a black box —
// someone can check what's stored about them, and have it removed.
const WHAT_REMEMBER_PATTERN =
  /^\s*what do you (?:remember|know) about me\b|\bwhat have i told you\b/i;
const FORGET_ME_PATTERN = /^\s*forget (?:about )?me\b|\bforget (?:what you know|everything) about me\b/i;

async function describeWhatIsRemembered(jid) {
  const personDoc = await PEOPLE.doc(jid).get();
  if (!personDoc.exists) {
    return "I don't have anything saved about you yet — introduce yourself (\"I'm <name>, <role>\") and I will.";
  }
  const p = personDoc.data();
  return `I have you saved as ${p.name}${p.role ? `, ${p.role}` : ""}. That's only ever shown back to you, never mentioned to anyone else's chat. Say "forget about me" to clear it.`;
}

async function forgetPerson(jid) {
  await PEOPLE.doc(jid).delete();
}

// Self-introduction — "I'm Vishwa, the software engineer", "my name is
// Lahiruka", etc. Stored per-JID, only ever shown back to that same person.
const INTRO_PATTERN = /\b(?:i'?m|i am|my name is|this is)\s+([A-Z][a-zA-Z]{1,30})\b[,:]?\s*(.*)/i;

async function maybeLearnIntroduction(jid, text) {
  const m = text.match(INTRO_PATTERN);
  if (!m) return;
  const name = m[1].trim();
  const role = m[2].trim().replace(/^(the|and|,)\s*/i, "").slice(0, 150) || null;
  try {
    await PEOPLE.doc(jid).set(
      { name, ...(role ? { role } : {}), jid, updatedAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to save person info:", err);
  }
}

// Anchored/specific on purpose — a bare "help" inside a normal sentence
// ("can you help me write an email") should go to the AI, not this menu.
const HELP_PATTERN =
  /^(?:help|commands)[.!?]?$|\bwhat (?:can you do|are your commands|commands do you have)\b|\blist (?:your )?commands\b/i;

const HELP_TEXT = [
  "Here's what I can do here on WhatsApp:",
  "",
  "• Just talk to me normally — ask questions, request a task, etc. Mention a new lead or something to track and I'll log it automatically.",
  '• "poster: <description>" or "flyer of <description>" — I’ll generate an image (attach or reply to a photo to use it as a style reference).',
  '• "remind me in 20 minutes to <note>" or "remind me tomorrow at 9am to <note>" — I’ll DM you back at that time.',
  '• "tell group <name>: <message>" — sends to that group now, or schedules it if you include a time.',
  '• "poll: <question>? <option>, <option>, ..." — sends a poll to this chat.',
  '• "remember that <fact>" — teaches me something to keep in mind going forward.',
  '• "what do you remember about me" / "forget about me" — check or clear what I know about you.',
  "• Send a voice note, photo, or document (PDF) and I'll read/listen and respond — works as a reply to earlier media too.",
  "",
  "In the company group, say “Leo” so I know you're talking to me.",
].join("\n");

// Executes whatever structured actions Gemini's tool-calling decided to
// take (log_lead, create_task) — writing to the same Firestore collections
// the dashboard's Overview/To-Do/Leads tabs already read, via companyData.ts's
// ListItem shape ({title, subtitle, meta?, accent?, createdAt}), so these
// show up there immediately, not just as a WhatsApp confirmation message.
async function executeActions(actions, byJid) {
  for (const action of actions || []) {
    try {
      if (action.type === "log_lead") {
        await LEADS.add({
          title: action.name,
          subtitle: [action.course, action.contact].filter(Boolean).join(" · ") || "New lead from WhatsApp",
          meta: "WhatsApp",
          accent: "violet",
          contact: action.contact || null,
          course: action.course || null,
          notes: action.notes || null,
          source: "whatsapp",
          loggedBy: byJid,
          createdAt: Date.now(),
        });
        await db
          .collection("activity")
          .add({
            title: "Logged a lead from WhatsApp",
            detail: action.name,
            type: "ok",
            createdAt: Date.now(),
          })
          .catch(() => {});
      } else if (action.type === "create_task") {
        await TASKS.add({
          title: action.title,
          subtitle: [action.assignee, action.dueDate].filter(Boolean).join(" · ") || "From WhatsApp",
          meta: "WhatsApp",
          accent: "cyan",
          assignee: action.assignee || null,
          dueDateRaw: action.dueDate || null,
          notes: action.notes || null,
          source: "whatsapp",
          createdBy: byJid,
          createdAt: Date.now(),
        });
        await db
          .collection("activity")
          .add({
            title: "Created a task from WhatsApp",
            detail: action.title,
            type: "ok",
            createdAt: Date.now(),
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error(`Failed to execute action ${action?.type}:`, err);
    }
  }
}

async function askLeo(jid, attachment) {
  if (!WEB_BASE_URL) {
    return "I'm not fully set up to chat here yet — ask the team to finish the WhatsApp setup (LEO_WEB_BASE_URL).";
  }
  try {
    const context = await getCompanyContext(jid);
    const res = await fetch(`${WEB_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: chatMemory.get(jid),
        context,
        attachments: attachment ? [{ data: attachment.data, mimeType: attachment.mimeType }] : undefined,
      }),
    });
    const data = await res.json();
    const reply = data?.reply || "Sorry, I didn't catch that — could you say it again?";
    remember(jid, "assistant", reply);
    if (Array.isArray(data?.actions) && data.actions.length > 0) {
      await executeActions(data.actions, jid);
    }
    return reply;
  } catch (err) {
    console.error("AI reply failed:", err);
    return "I couldn't reach my systems just now — try again shortly.";
  }
}

function extractText(message) {
  return (
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    ""
  ).trim();
}

// "poll: <question>? <option>, <option>, ..." — a quick way to get a group
// decision without someone manually tallying replies.
const POLL_PATTERN = /^\s*poll\s*[:\-]\s*(.+?)\?\s*(.+)/i;

function parsePoll(text) {
  const m = text.match(POLL_PATTERN);
  if (!m) return null;
  const question = m[1].trim();
  const options = m[2]
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 12); // WhatsApp's own poll option limit
  if (!question || options.length < 2) return null;
  return { question, options };
}

// "poster: <description>" / "poster <description>" / "make a poster of..."
const POSTER_PATTERN = /\b(?:posters?|flyers?)\b\s*(?:of|for|about)?\s*[:\-]?\s*(.+)/i;

async function generatePoster(prompt, referenceImage) {
  if (!WEB_BASE_URL) {
    throw new Error("LEO_WEB_BASE_URL is not set");
  }
  const res = await fetch(`${WEB_BASE_URL}/api/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, referenceImage: referenceImage || undefined }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Image generation failed (HTTP ${res.status})`);
  }
  return res.json(); // { image: base64, mimeType, model }
}

/** Looks for an image to use as a style/content reference: either the
 * incoming message itself is a photo with a "poster: ..." caption, or it's
 * a text reply quoting an earlier photo ("poster: use this logo" as a
 * reply to a logo image). Returns { data: base64, mimeType } or null. */
/** Finds an image, voice/audio, or document (PDF) message to work with,
 * whether it's the message itself (a photo with a "poster: ..." caption, a
 * voice note sent directly, a forwarded PDF) or it's a text reply quoting
 * an earlier one ("Leo, what does this say" as a reply to a photo, voice
 * note, or document someone sent earlier). Gemini accepts PDFs the same
 * way as images — as an inlineData part — so no separate parsing needed.
 * Returns { data: base64, mimeType, kind: 'image' | 'audio' | 'document' }
 * or null. */
async function getAttachment(activeSock, msg) {
  let mediaMessage = null;
  let kind = null;
  let key = msg.key;

  if (msg.message?.imageMessage) {
    mediaMessage = { imageMessage: msg.message.imageMessage };
    kind = "image";
  } else if (msg.message?.audioMessage) {
    mediaMessage = { audioMessage: msg.message.audioMessage };
    kind = "audio";
  } else if (msg.message?.documentMessage) {
    mediaMessage = { documentMessage: msg.message.documentMessage };
    kind = "document";
  } else {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedKey = {
      remoteJid: msg.key.remoteJid,
      id: ctx?.stanzaId,
      participant: ctx?.participant,
      fromMe: false,
    };
    if (ctx?.quotedMessage?.imageMessage) {
      mediaMessage = { imageMessage: ctx.quotedMessage.imageMessage };
      kind = "image";
      key = quotedKey;
    } else if (ctx?.quotedMessage?.audioMessage) {
      mediaMessage = { audioMessage: ctx.quotedMessage.audioMessage };
      kind = "audio";
      key = quotedKey;
    } else if (ctx?.quotedMessage?.documentMessage) {
      mediaMessage = { documentMessage: ctx.quotedMessage.documentMessage };
      kind = "document";
      key = quotedKey;
    }
  }

  if (!mediaMessage) return null;

  try {
    const buffer = await downloadMediaMessage(
      { key, message: mediaMessage },
      "buffer",
      {},
      { logger, reuploadRequest: activeSock.updateMediaMessage }
    );
    const inner = mediaMessage.imageMessage || mediaMessage.audioMessage || mediaMessage.documentMessage;
    const defaultMime = kind === "image" ? "image/jpeg" : kind === "audio" ? "audio/ogg" : "application/pdf";
    return {
      data: buffer.toString("base64"),
      mimeType: inner.mimetype || defaultMime,
      kind,
    };
  } catch (err) {
    console.error(`Failed to download ${kind ?? "media"}:`, err);
    return null;
  }
}

// Times said in chat ("at 5pm", "tomorrow at 9am") mean local Sri Lanka
// time, not the server's — this worker runs in UTC on Railway, and without
// this, "5pm" would get scheduled for 5pm UTC (10:30pm in Colombo), which
// is exactly why reminders looked broken/wrong before this fix.
const LOCAL_TZ_OFFSET_MINUTES = Number(process.env.REMINDER_TZ_OFFSET_MINUTES ?? 330); // UTC+5:30
function chronoRef() {
  return { instant: new Date(), timezone: LOCAL_TZ_OFFSET_MINUTES };
}

// --- Reminders ("remind me ... at/in ...") ---------------------------------
function parseReminder(text) {
  if (!/\bremind me\b/i.test(text)) return null;

  const results = chrono.parse(text, chronoRef(), { forwardDate: true });
  if (results.length === 0) return null; // no time found — caller asks for one

  const match = results[0];
  const due = match.start.date();
  let note = (text.slice(0, match.index) + text.slice(match.index + match.text.length)).trim();
  note = note
    .replace(/\bremind me\b/i, "")
    .replace(/^(to|that|about)\b\s*/i, "")
    .replace(/^[,:\-]\s*/, "")
    .replace(/[,:\-]\s*$/, "")
    .trim();
  return { due, note: note || "this" };
}

// --- Named-group messages ("tell/message/send group <name>: <message>") ---
const GROUP_SEND_PATTERN =
  /\b(?:tell|message|send(?:\s+to)?|notify)\s+(?:the\s+)?group\s+([^:,]+?)\s*(?:that\s+)?[:,]\s*(.+)/i;

function parseGroupSend(text) {
  const m = text.match(GROUP_SEND_PATTERN);
  if (!m) return null;

  const groupNameRaw = m[1].trim();
  let message = m[2].trim();
  let due = null;

  const timeResults = chrono.parse(message, chronoRef(), { forwardDate: true });
  if (timeResults.length > 0) {
    const tm = timeResults[0];
    due = tm.start.date();
    message = (message.slice(0, tm.index) + message.slice(tm.index + tm.text.length)).trim();
    message = message
      .replace(/^(at|on)\b\s*/i, "")
      .replace(/^[,:\-]\s*/, "")
      .replace(/[,:\-]\s*$/, "")
      .trim();
  }

  return { groupNameRaw, message: message || groupNameRaw, due };
}

// Cache of group name -> jid, since listing groups is a real WhatsApp call.
let groupCache = { fetchedAt: 0, byName: new Map() };
const GROUP_CACHE_TTL_MS = 5 * 60 * 1000;

async function getGroupsByName(activeSock) {
  if (Date.now() - groupCache.fetchedAt < GROUP_CACHE_TTL_MS && groupCache.byName.size > 0) {
    return groupCache.byName;
  }
  const groups = await activeSock.groupFetchAllParticipating();
  const byName = new Map();
  for (const jid of Object.keys(groups)) {
    const subject = groups[jid]?.subject;
    if (subject) byName.set(subject.toLowerCase(), jid);
  }
  groupCache = { fetchedAt: Date.now(), byName };
  return byName;
}

async function resolveGroup(activeSock, nameQuery) {
  const byName = await getGroupsByName(activeSock);
  const q = nameQuery.trim().toLowerCase();
  if (byName.has(q)) return { jid: byName.get(q), name: nameQuery.trim() };
  for (const [name, jid] of byName.entries()) {
    if (name.includes(q) || q.includes(name)) return { jid, name };
  }
  return null;
}

async function scheduleMessage({ type, targetJid, targetLabel, message, dueAt, createdBy }) {
  await SCHEDULED.add({
    type,
    targetJid,
    targetLabel,
    message,
    dueAt,
    createdBy,
    sent: false,
    createdAt: Date.now(),
  });
}

function formatDue(date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  });
}

/** Runs on an interval: sends anything in scheduledMessages whose time has
 * come. Deliberately checks `sent` only and filters the due time in JS
 * rather than in the Firestore query, to avoid needing a composite index. */
async function runScheduler() {
  if (!sock || socketState !== "open") return;
  const now = Date.now();
  try {
    const snap = await SCHEDULED.where("sent", "==", false).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.dueAt || data.dueAt > now) continue;
      try {
        const prefix = data.type === "reminder" ? "⏰ Reminder: " : "";
        await sock.sendMessage(data.targetJid, { text: `${prefix}${data.message}` });
        await doc.ref.update({ sent: true, sentAt: Date.now() });
        await db
          .collection("activity")
          .add({
            title: data.type === "reminder" ? "Sent a reminder" : "Sent a scheduled group message",
            detail: `${data.targetLabel}: "${data.message.slice(0, 60)}"`,
            type: "ok",
            createdAt: Date.now(),
          })
          .catch(() => {});
      } catch (err) {
        console.error("Failed to send a scheduled message:", err);
      }
    }
  } catch (err) {
    console.error("Scheduler check failed:", err);
  }
}

// --- Daily ops digest (opt-in) ---------------------------------------------
// Off by default — set DAILY_DIGEST_JID (e.g. Ms. Lahiruka's own WhatsApp
// number as a JID) to get a once-a-day morning summary of new leads/tasks
// logged through WhatsApp in the last 24h, instead of needing to check the
// dashboard. Checked periodically rather than on a precise cron, so "once a
// day" means "once per local calendar day, the first time this check runs
// at/after 8am Colombo time" — close enough for a digest, not exact-to-the-
// minute like a reminder needs to be.
const DIGEST_META_REF = db.collection("meta").doc("dailyDigest");

async function maybeSendDailyDigest() {
  if (!DAILY_DIGEST_JID || !sock || socketState !== "open") return;

  const now = new Date();
  const localDateStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" }); // YYYY-MM-DD
  const localHour = Number(
    now.toLocaleString("en-US", { timeZone: "Asia/Colombo", hour: "2-digit", hour12: false })
  );
  if (localHour < 8) return;

  try {
    const metaDoc = await DIGEST_META_REF.get();
    if (metaDoc.exists && metaDoc.data()?.lastSentDate === localDateStr) return;

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const [leadsSnap, tasksSnap] = await Promise.all([
      LEADS.where("createdAt", ">=", since).get(),
      TASKS.where("createdAt", ">=", since).get(),
    ]);

    if (leadsSnap.empty && tasksSnap.empty) {
      await DIGEST_META_REF.set({ lastSentDate: localDateStr }, { merge: true });
      return; // nothing to report — stay quiet rather than a pointless "0 and 0" ping
    }

    const lines = [
      "Morning digest — last 24h:",
      `• ${leadsSnap.size} new lead${leadsSnap.size === 1 ? "" : "s"}`,
      `• ${tasksSnap.size} new task${tasksSnap.size === 1 ? "" : "s"}`,
    ];
    if (!leadsSnap.empty) {
      lines.push("", "Leads:");
      leadsSnap.docs.slice(0, 10).forEach((d) => lines.push(`- ${d.data().title}`));
    }
    if (!tasksSnap.empty) {
      lines.push("", "Tasks:");
      tasksSnap.docs.slice(0, 10).forEach((d) => lines.push(`- ${d.data().title}`));
    }

    await sock.sendMessage(DAILY_DIGEST_JID, { text: lines.join("\n") });
    await DIGEST_META_REF.set({ lastSentDate: localDateStr }, { merge: true });
  } catch (err) {
    console.error("Daily digest failed:", err);
  }
}

// How long to wait after the last message in a chat before actually
// processing it. Without this, someone typing a thought across several
// quick messages ("remind me" / "in 10 minutes" / "to call the vendor")
// got handled as three separate, disconnected turns — exactly the
// "confused, answers the wrong thing" symptom this fixes. Each buffered
// message is joined with a newline and treated as one combined turn, run
// through the same dispatch logic (and the same last-20-messages
// context) as a single message would be.
const TURN_DEBOUNCE_MS = 3000;
const pendingTurns = new Map(); // remoteJid -> { parts, senderJid, isGroup, representativeMsg, timer }

async function processTurn(activeSock, { remoteJid, senderJid, isGroup, askText, msg }) {
  try {
    const attachment = msg ? await getAttachment(activeSock, msg) : null;

    // Every message gets permanently saved here, once, regardless of
    // which branch below ends up handling it — not just AI replies. A
    // bare photo/voice note with no text gets a readable placeholder
    // instead of an empty history entry.
    await ensureHistoryLoaded(remoteJid);
    const attachmentPlaceholder =
      attachment?.kind === "image"
        ? "[image]"
        : attachment?.kind === "audio"
          ? "[voice message]"
          : attachment?.kind === "document"
            ? "[document]"
            : "";
    const historyText = askText || attachmentPlaceholder;
    remember(remoteJid, "user", historyText);

    // Learn who's speaking, silently — never changes what gets replied.
    maybeLearnIntroduction(senderJid, askText).catch(() => {});

        const rememberMatch = askText.match(REMEMBER_PATTERN);
        const whatRemember = !rememberMatch && WHAT_REMEMBER_PATTERN.test(askText);
        const forgetMe = !rememberMatch && !whatRemember && FORGET_ME_PATTERN.test(askText);
        const pollMatch = !rememberMatch && !whatRemember && !forgetMe ? parsePoll(askText) : null;
        const posterMatch = !rememberMatch && !whatRemember && !forgetMe && !pollMatch ? askText.match(POSTER_PATTERN) : null;
        const reminder = !rememberMatch && !whatRemember && !forgetMe && !pollMatch ? parseReminder(askText) : null;
        const groupSend =
          !rememberMatch && !whatRemember && !forgetMe && !pollMatch && !reminder ? parseGroupSend(askText) : null;

        if (HELP_PATTERN.test(askText)) {
          await activeSock.sendMessage(remoteJid, { text: HELP_TEXT });
          remember(remoteJid, "assistant", HELP_TEXT);
        } else if (whatRemember) {
          const text = await describeWhatIsRemembered(senderJid);
          await activeSock.sendMessage(remoteJid, { text });
          remember(remoteJid, "assistant", text);
        } else if (forgetMe) {
          await forgetPerson(senderJid);
          const text =
            "Done — I've forgotten your name/role. (Your message history in this chat stays, same as any WhatsApp chat — this only clears what I knew about who you are.)";
          await activeSock.sendMessage(remoteJid, { text });
          remember(remoteJid, "assistant", text);
        } else if (rememberMatch) {
          const fact = rememberMatch[1].trim();
          await rememberFact(fact, senderJid, isGroup ? "group" : "dm");
          const confirmText = `Got it — I'll remember that: "${fact}".`;
          await activeSock.sendMessage(remoteJid, { text: confirmText });
          remember(remoteJid, "assistant", confirmText);
          await db
            .collection("activity")
            .add({
              title: "Learned a new fact",
              detail: fact.slice(0, 60),
              type: "ok",
              createdAt: Date.now(),
            })
            .catch(() => {});
        } else if (pollMatch) {
          try {
            await activeSock.sendMessage(remoteJid, {
              poll: { name: pollMatch.question, values: pollMatch.options, selectableCount: 1 },
            });
            const confirmText = `Poll sent: "${pollMatch.question}"`;
            remember(remoteJid, "assistant", confirmText);
            await db
              .collection("activity")
              .add({
                title: "Sent a poll on WhatsApp",
                detail: pollMatch.question.slice(0, 60),
                type: "ok",
                createdAt: Date.now(),
              })
              .catch(() => {});
          } catch (err) {
            console.error("Failed to send poll:", err);
            const errText = "Couldn't send that poll — try again shortly.";
            await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
            remember(remoteJid, "assistant", errText);
          }
        } else if (posterMatch) {
          const prompt = posterMatch[1].trim();
          try {
            const referenceImage = attachment?.kind === "image" ? attachment : null;
            const { image, mimeType } = await generatePoster(prompt, referenceImage);
            const caption = referenceImage
              ? `Here's your poster (using your reference image): "${prompt}"`
              : `Here's your poster: "${prompt}"`;
            await activeSock.sendMessage(remoteJid, {
              image: Buffer.from(image, "base64"),
              mimetype: mimeType,
              caption,
            });
            remember(remoteJid, "assistant", caption);
            await db
              .collection("activity")
              .add({
                title: "Generated a poster on WhatsApp",
                detail: `${prompt.slice(0, 60)}${referenceImage ? " (with reference image)" : ""}`,
                type: "ok",
                createdAt: Date.now(),
              })
              .catch(() => {});
          } catch (err) {
            const errText = `Couldn't generate that poster — ${err.message || "try again shortly"}.`;
            await activeSock.sendMessage(remoteJid, { text: errText });
            remember(remoteJid, "assistant", errText);
          }
        } else if (/\bremind me\b/i.test(askText) && !reminder) {
          // They said "remind me" but no time was understood.
          const askTimeText =
            'What time should I remind you? e.g. "remind me in 20 minutes to call the vendor" or "remind me tomorrow at 9am to send the report".';
          await activeSock.sendMessage(remoteJid, { text: askTimeText });
          remember(remoteJid, "assistant", askTimeText);
        } else if (reminder) {
          try {
            const dueAt = reminder.due.getTime();
            console.log(
              `[reminder] scheduling for ${senderJid}: "${reminder.note}" at ${new Date(dueAt).toISOString()} (in ${Math.round((dueAt - Date.now()) / 1000)}s)`
            );
            await scheduleMessage({
              type: "reminder",
              targetJid: senderJid,
              targetLabel: "you",
              message: reminder.note,
              dueAt,
              createdBy: senderJid,
            });
            const confirmText = `Got it — I'll remind you about "${reminder.note}" on ${formatDue(reminder.due)}.`;
            await activeSock.sendMessage(remoteJid, { text: confirmText });
            remember(remoteJid, "assistant", confirmText);
          } catch (err) {
            console.error("Failed to schedule reminder:", err);
            const errText = "Something went wrong setting that reminder — please try again.";
            await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
            remember(remoteJid, "assistant", errText);
          }
        } else if (groupSend) {
          try {
            const group = await resolveGroup(activeSock, groupSend.groupNameRaw).catch((err) => {
              console.error("Failed to resolve group list:", err);
              return null;
            });
            if (!group) {
              const notFoundText = `I couldn't find a group called "${groupSend.groupNameRaw}" that I'm a member of.`;
              await activeSock.sendMessage(remoteJid, { text: notFoundText });
              remember(remoteJid, "assistant", notFoundText);
            } else if (groupSend.due) {
              const dueAt = groupSend.due.getTime();
              console.log(
                `[group-send] scheduling for ${group.name} (${group.jid}) at ${new Date(dueAt).toISOString()} (in ${Math.round((dueAt - Date.now()) / 1000)}s)`
              );
              await scheduleMessage({
                type: "group",
                targetJid: group.jid,
                targetLabel: group.name,
                message: groupSend.message,
                dueAt,
                createdBy: senderJid,
              });
              const scheduledText = `Scheduled — I'll message "${group.name}" on ${formatDue(groupSend.due)}.`;
              await activeSock.sendMessage(remoteJid, { text: scheduledText });
              remember(remoteJid, "assistant", scheduledText);
            } else {
              await activeSock.sendMessage(group.jid, { text: groupSend.message });
              await ensureHistoryLoaded(group.jid);
              remember(group.jid, "assistant", groupSend.message);
              const sentText = `Sent to "${group.name}".`;
              await activeSock.sendMessage(remoteJid, { text: sentText });
              remember(remoteJid, "assistant", sentText);
              await db
                .collection("activity")
                .add({
                  title: "Sent a message to a group",
                  detail: `${group.name}: "${groupSend.message.slice(0, 60)}"`,
                  type: "ok",
                  createdAt: Date.now(),
                })
                .catch(() => {});
            }
          } catch (err) {
            console.error("Failed to handle group-send:", err);
            const errText = "Something went wrong sending that to the group — please try again.";
            await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
            remember(remoteJid, "assistant", errText);
          }
        } else {
          const reply = await askLeo(remoteJid, attachment);
          await activeSock.sendMessage(remoteJid, { text: reply });
          await db
            .collection("activity")
            .add({
              title: attachment
                ? `Read a${attachment.kind === "image" ? "n image" : attachment.kind === "document" ? " document" : " voice message"} on WhatsApp`
                : "Replied on WhatsApp",
              detail: isGroup ? `Group message: "${historyText.slice(0, 60)}"` : `DM: "${historyText.slice(0, 60)}"`,
              type: "ok",
              createdAt: Date.now(),
            })
            .catch(() => {});
        }

    await activeSock.sendPresenceUpdate("paused", remoteJid).catch(() => {});
  } catch (err) {
    console.error("Failed to handle an incoming WhatsApp message:", err);
  }
}

function attachMessageHandler(activeSock) {
  activeSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid === "status@broadcast") continue;
        if (msg.key.fromMe) continue; // don't reply to LEO's own messages

        const text = extractText(msg.message);
        const hasImage = Boolean(msg.message?.imageMessage);
        const hasAudio = Boolean(msg.message?.audioMessage);
        const hasDocument = Boolean(msg.message?.documentMessage);
        const hasMedia = hasImage || hasAudio || hasDocument;
        if (!text && !hasMedia) continue;

        const isGroup = remoteJid.endsWith("@g.us");
        // In a group, a bare photo/voice note with no mention at all isn't
        // meant for LEO — he only joins in when actually addressed, either
        // as this message's own caption or (resolved later, via the quoted
        // message) as a reply to a piece of media: "Leo, what does this say".
        if (isGroup && !MENTION_PATTERN.test(text || "")) continue;

        const askText = isGroup && text ? text.replace(MENTION_PATTERN, "").trim() || text : text;
        // Reminders are personal — if said inside a group, reply to the
        // person who asked, not the whole group.
        const senderJid = isGroup ? msg.key.participant || remoteJid : remoteJid;

        await activeSock.sendPresenceUpdate("composing", remoteJid).catch(() => {});

        let entry = pendingTurns.get(remoteJid);
        if (!entry) {
          entry = { parts: [], senderJid, isGroup, representativeMsg: msg, timer: null };
          pendingTurns.set(remoteJid, entry);
        }
        if (askText) entry.parts.push(askText);
        // Prefer a message that actually carries (or quotes) media over a
        // plain text one, so poster/vision/voice lookups find it.
        const quotedCtx = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (hasMedia || quotedCtx?.imageMessage || quotedCtx?.audioMessage || quotedCtx?.documentMessage) {
          entry.representativeMsg = msg;
        }

        if (entry.timer) clearTimeout(entry.timer);
        entry.timer = setTimeout(() => {
          pendingTurns.delete(remoteJid);
          const combinedText = entry.parts.join("\n").trim();
          if (!combinedText && !entry.representativeMsg) return;
          processTurn(activeSock, {
            remoteJid,
            senderJid: entry.senderJid,
            isGroup: entry.isGroup,
            askText: combinedText,
            msg: entry.representativeMsg,
          }).catch((err) => console.error("Failed to process a WhatsApp turn:", err));
        }, TURN_DEBOUNCE_MS);
      } catch (err) {
        console.error("Failed to buffer an incoming WhatsApp message:", err);
      }
    }
  });
}

async function setStatus(partial) {
  await STATUS_DOC.set({ ...partial, updatedAt: Date.now() }, { merge: true });
}

async function startSock() {
  if (socketState === "connecting" || socketState === "open") {
    console.log(`startSock() called while already ${socketState} — ignoring duplicate call.`);
    return;
  }
  if (starting) return;
  starting = true;
  socketState = "connecting";

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
    });

    sock.ev.on("creds.update", saveCreds);
    attachMessageHandler(sock);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await setStatus({ status: "qr", qr: qrDataUrl, error: FieldValue.delete() });
      }

      if (connection === "open") {
        socketState = "open";
        const phoneNumber = sock?.user?.id?.split(":")[0] ?? null;
        await setStatus({
          status: "connected",
          phoneNumber,
          connectedAt: Date.now(),
          qr: FieldValue.delete(),
          error: FieldValue.delete(),
        });
        console.log("WhatsApp connected as", phoneNumber);
      }

      if (connection === "close") {
        socketState = "idle";
        const statusCode =
          lastDisconnect?.error instanceof Boom
            ? lastDisconnect.error.output?.statusCode
            : undefined;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          await setStatus({ status: "disconnected", qr: FieldValue.delete() });
          console.log("Logged out. Clear auth_info (or redeploy) and request a fresh link to relink.");
        } else {
          await setStatus({ status: "connecting" });
          console.log("Connection closed, reconnecting…", statusCode);
          starting = false;
          // Brief delay rather than an immediate retry — avoids hammering
          // WhatsApp's servers if something is still genuinely conflicting
          // (e.g. the session got linked again elsewhere).
          setTimeout(() => startSock(), 2000);
          return;
        }
      }
    });
  } catch (err) {
    console.error("Failed to start WhatsApp socket:", err);
    socketState = "idle";
    await setStatus({ status: "error", error: String(err?.message || err) });
  } finally {
    starting = false;
  }
}

async function unlink() {
  try {
    if (sock) {
      await sock.logout().catch(() => {});
    }
  } finally {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    sock = null;
    socketState = "idle";
    await setStatus({
      status: "disconnected",
      qr: FieldValue.delete(),
      phoneNumber: FieldValue.delete(),
    });
    console.log("Unlinked.");
  }
}

// --- Commands from the dashboard (link / unlink) --------------------------
COMMANDS.orderBy("createdAt", "asc").onSnapshot((snap) => {
  snap.docChanges().forEach(async (change) => {
    if (change.type !== "added") return;
    const data = change.doc.data();
    if (data.processed) return;
    await change.doc.ref.update({ processed: true, processedAt: Date.now() }).catch(() => {});

    try {
      if (data.type === "link") {
        await setStatus({ status: "connecting" });
        await startSock();
      } else if (data.type === "unlink") {
        await unlink();
      }
    } catch (err) {
      console.error("Command failed:", err);
    }
  });
});

// --- Outbox: messages the dashboard/scheduler wants sent ------------------
// A doc looks like { to: "<jid>", text: "...", createdAt }. `to` is a
// WhatsApp JID: a group ("123...-456...@g.us") or a number
// ("94771234567@s.whatsapp.net").
OUTBOX.orderBy("createdAt", "asc").onSnapshot((snap) => {
  snap.docChanges().forEach(async (change) => {
    if (change.type !== "added") return;
    const data = change.doc.data();
    if (data.sent) return;

    try {
      if (sock && data.to && data.text) {
        await sock.sendMessage(data.to, { text: data.text });
        await change.doc.ref.update({ sent: true, sentAt: Date.now() });
      } else {
        await change.doc.ref.update({
          sent: false,
          error: "Not connected, or message is missing to/text.",
        });
      }
    } catch (err) {
      await change.doc.ref.update({ sent: false, error: String(err?.message || err) });
    }
  });
});

await setStatus({ status: "disconnected" });
await seedKnowledgeIfEmpty();
console.log("LEO WhatsApp bridge is up. Waiting for a link request from the dashboard…");

// If credentials already exist from a previous run (e.g. a restart, not a
// fresh deploy), reconnect automatically instead of waiting for a new
// "link" command.
if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) {
  startSock();
}

// Reminders and scheduled group messages — checked frequently enough that
// "remind me in 5 minutes" is actually useful, not just daily digests.
setInterval(runScheduler, 20_000);

// The digest itself only needs to be checked a few times around the
// morning, not every 20s — every 10 minutes is plenty.
setInterval(maybeSendDailyDigest, 10 * 60_000);

process.on("SIGTERM", () => process.exit(0));
