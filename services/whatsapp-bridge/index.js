import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
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

// Short-lived, in-memory per-chat conversation context (lost on restart —
// good enough for "what did I just ask", not meant as permanent history).
const chatMemory = new Map();
function remember(jid, role, content) {
  const history = chatMemory.get(jid) ?? [];
  history.push({ role, content });
  while (history.length > 12) history.shift();
  chatMemory.set(jid, history);
}

async function askLeo(jid, text) {
  remember(jid, "user", text);
  if (!WEB_BASE_URL) {
    return "I'm not fully set up to chat here yet — ask the team to finish the WhatsApp setup (LEO_WEB_BASE_URL).";
  }
  try {
    const res = await fetch(`${WEB_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: chatMemory.get(jid) }),
    });
    const data = await res.json();
    const reply = data?.reply || "Sorry, I didn't catch that — could you say it again?";
    remember(jid, "assistant", reply);
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

// "poster: <description>" / "poster <description>" / "make a poster of..."
const POSTER_PATTERN = /\b(?:posters?|flyers?)\b\s*(?:of|for|about)?\s*[:\-]?\s*(.+)/i;

async function generatePoster(prompt) {
  if (!WEB_BASE_URL) {
    throw new Error("LEO_WEB_BASE_URL is not set");
  }
  const res = await fetch(`${WEB_BASE_URL}/api/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Image generation failed (HTTP ${res.status})`);
  }
  return res.json(); // { image: base64, mimeType, model }
}

// --- Reminders ("remind me ... at/in ...") ---------------------------------
function parseReminder(text) {
  if (!/\bremind me\b/i.test(text)) return null;

  const results = chrono.parse(text, new Date());
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

  const timeResults = chrono.parse(message, new Date());
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

function attachMessageHandler(activeSock) {
  activeSock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      try {
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid === "status@broadcast") continue;
        if (msg.key.fromMe) continue; // don't reply to LEO's own messages

        const text = extractText(msg.message);
        if (!text) continue;

        const isGroup = remoteJid.endsWith("@g.us");
        if (isGroup && !MENTION_PATTERN.test(text)) continue;

        const askText = isGroup ? text.replace(MENTION_PATTERN, "").trim() || text : text;
        // Reminders are personal — if said inside a group, reply to the
        // person who asked, not the whole group.
        const senderJid = isGroup ? msg.key.participant || remoteJid : remoteJid;

        await activeSock.sendPresenceUpdate("composing", remoteJid).catch(() => {});

        const posterMatch = askText.match(POSTER_PATTERN);
        const reminder = parseReminder(askText);
        const groupSend = !reminder ? parseGroupSend(askText) : null;

        if (posterMatch) {
          const prompt = posterMatch[1].trim();
          try {
            const { image, mimeType } = await generatePoster(prompt);
            await activeSock.sendMessage(remoteJid, {
              image: Buffer.from(image, "base64"),
              mimetype: mimeType,
              caption: `Here's your poster: "${prompt}"`,
            });
            await db
              .collection("activity")
              .add({
                title: "Generated a poster on WhatsApp",
                detail: prompt.slice(0, 60),
                type: "ok",
                createdAt: Date.now(),
              })
              .catch(() => {});
          } catch (err) {
            await activeSock.sendMessage(remoteJid, {
              text: `Couldn't generate that poster — ${err.message || "try again shortly"}.`,
            });
          }
        } else if (/\bremind me\b/i.test(askText) && !reminder) {
          // They said "remind me" but no time was understood.
          await activeSock.sendMessage(remoteJid, {
            text: 'What time should I remind you? e.g. "remind me in 20 minutes to call the vendor" or "remind me tomorrow at 9am to send the report".',
          });
        } else if (reminder) {
          const dueAt = reminder.due.getTime();
          await scheduleMessage({
            type: "reminder",
            targetJid: senderJid,
            targetLabel: "you",
            message: reminder.note,
            dueAt,
            createdBy: senderJid,
          });
          await activeSock.sendMessage(remoteJid, {
            text: `Got it — I'll remind you about "${reminder.note}" on ${formatDue(reminder.due)}.`,
          });
        } else if (groupSend) {
          const group = await resolveGroup(activeSock, groupSend.groupNameRaw).catch(() => null);
          if (!group) {
            await activeSock.sendMessage(remoteJid, {
              text: `I couldn't find a group called "${groupSend.groupNameRaw}" that I'm a member of.`,
            });
          } else if (groupSend.due) {
            await scheduleMessage({
              type: "group",
              targetJid: group.jid,
              targetLabel: group.name,
              message: groupSend.message,
              dueAt: groupSend.due.getTime(),
              createdBy: senderJid,
            });
            await activeSock.sendMessage(remoteJid, {
              text: `Scheduled — I'll message "${group.name}" on ${formatDue(groupSend.due)}.`,
            });
          } else {
            await activeSock.sendMessage(group.jid, { text: groupSend.message });
            await activeSock.sendMessage(remoteJid, {
              text: `Sent to "${group.name}".`,
            });
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
        } else {
          const reply = await askLeo(remoteJid, askText);
          await activeSock.sendMessage(remoteJid, { text: reply });
          await db
            .collection("activity")
            .add({
              title: "Replied on WhatsApp",
              detail: isGroup ? `Group message: "${askText.slice(0, 60)}"` : `DM: "${askText.slice(0, 60)}"`,
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

process.on("SIGTERM", () => process.exit(0));
