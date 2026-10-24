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

const AUTH_DIR = process.env.AUTH_DIR || "./auth_info";
const logger = pino({ level: process.env.LOG_LEVEL || "warn" });

let sock = null;
let starting = false;

async function setStatus(partial) {
  await STATUS_DOC.set({ ...partial, updatedAt: Date.now() }, { merge: true });
}

async function startSock() {
  if (starting) return;
  starting = true;

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

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await setStatus({ status: "qr", qr: qrDataUrl, error: FieldValue.delete() });
      }

      if (connection === "open") {
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
          startSock();
          return;
        }
      }
    });
  } catch (err) {
    console.error("Failed to start WhatsApp socket:", err);
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

process.on("SIGTERM", () => process.exit(0));
