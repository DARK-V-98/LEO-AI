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
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import PDFDocument from "pdfkit";

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
const WHATSAPP_ADMINS = db.collection("whatsappAdmins");
const LMS_STATUS_DOC = db.collection("lms").doc("status");
const LMS_CHECK_REQUESTS = db.collection("lmsCheckRequests");

// Optional: a WhatsApp JID (a number like "94771234567@s.whatsapp.net") to
// send a once-a-day summary of new leads/tasks to. Unset by default — the
// digest is simply skipped until someone opts in by setting this.
const DAILY_DIGEST_JID = process.env.DAILY_DIGEST_JID || null;

// --- SmartLabs LMS integration -------------------------------------------
// A completely separate Firebase project/app (esystemlk/lms-smartlabs),
// reached only through its own protected /api/leo/* routes — never direct
// Firestore access from here. LMS_API_KEY is the shared secret those
// routes check (their LEO_API_KEY); LMS_BASE_URL is the LMS's own deployed
// URL. Both unset by default — LMS commands are simply disabled until set.
const LMS_BASE_URL = process.env.LMS_BASE_URL || null;
const LMS_API_KEY = process.env.LMS_API_KEY || null;

async function callLms(path, { method = "GET", body } = {}) {
  if (!LMS_BASE_URL || !LMS_API_KEY) {
    throw new Error("LMS integration isn't configured yet (LMS_BASE_URL/LMS_API_KEY).");
  }
  const res = await fetch(`${LMS_BASE_URL}${path}`, {
    method,
    headers: {
      "x-api-key": LMS_API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `LMS request failed (HTTP ${res.status})`);
  }
  return data;
}

const lmsFindStudents = (q) => callLms(`/api/leo/students?q=${encodeURIComponent(q)}`).then((d) => d.students || []);
const lmsListCourses = () => callLms("/api/leo/courses").then((d) => d.courses || []);

// Cached course catalog, injected into every chat's context (see
// getCompanyContext) so ordinary questions like "do you have a Python
// course" are grounded in what's actually offered instead of the model
// guessing/inventing a course name. A short TTL since the catalog barely
// changes but we don't want every single message hitting the LMS.
const COURSE_CACHE_TTL_MS = 5 * 60 * 1000;
let courseCache = { fetchedAt: 0, courses: [] };

async function getLmsCoursesCached() {
  if (Date.now() - courseCache.fetchedAt < COURSE_CACHE_TTL_MS) return courseCache.courses;
  try {
    const courses = await lmsListCourses();
    courseCache = { fetchedAt: Date.now(), courses };
    return courses;
  } catch (err) {
    console.error("Failed to refresh LMS course cache:", err);
    return courseCache.courses; // stale (possibly empty) fallback rather than failing the whole reply
  }
}

function formatCourseContext(courses) {
  if (!courses.length) return "";
  const lines = courses.map((c) => {
    const batches = (c.batches || [])
      .map((b) => `${b.name} (${b.status}${b.maxStudents ? `, ${b.enrolledCount}/${b.maxStudents}` : ""})`)
      .join("; ");
    return `- ${c.title}${c.category ? ` [${c.category}]` : ""}: ${batches || "no open batches listed"}`;
  });
  return (
    "Real courses SmartLabs currently offers (from the LMS — this is the " +
    "complete, authoritative list; never mention or confirm a course that " +
    "isn't here, and if asked about one that isn't listed, say plainly " +
    "it's not currently offered rather than guessing):\n" +
    lines.join("\n")
  );
}
const lmsListPendingEnrollments = () =>
  callLms("/api/leo/enrollments/pending").then((d) => d.enrollments || []);
const lmsApprove = (enrollmentId, adminPhoneNumber) =>
  callLms("/api/leo/enrollments/approve", { method: "POST", body: { enrollmentId, adminPhoneNumber } });
const lmsReject = (enrollmentId, adminPhoneNumber, reason) =>
  callLms("/api/leo/enrollments/reject", { method: "POST", body: { enrollmentId, adminPhoneNumber, reason } });
const lmsGrant = (studentId, courseId, batchId, adminPhoneNumber) =>
  callLms("/api/leo/enrollments/grant", { method: "POST", body: { studentId, courseId, batchId, adminPhoneNumber } });
const lmsRemove = (enrollmentId, adminPhoneNumber, hard) =>
  callLms("/api/leo/enrollments/remove", { method: "POST", body: { enrollmentId, adminPhoneNumber, hard } });
// Full course roster (names/emails/contacts) and an atomic transfer (bans
// the old enrollment, grants the new one in one Firestore batch) — added
// to the LMS once the gaps documented in the "LEO ↔ SmartLabs LMS:
// Remaining API Changes" doc were fixed on that side.
const lmsCourseRoster = (courseId, opts = {}) => {
  const params = new URLSearchParams();
  if (opts.batchId) params.set("batchId", opts.batchId);
  if (opts.status) params.set("status", opts.status);
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return callLms(`/api/leo/courses/${encodeURIComponent(courseId)}/students${qs ? `?${qs}` : ""}`);
};
const lmsTransfer = (studentId, fromCourseId, toCourseId, toBatchId, adminPhoneNumber) =>
  callLms("/api/leo/enrollments/transfer", {
    method: "POST",
    body: { studentId, fromCourseId, toCourseId, toBatchId, adminPhoneNumber },
  });

// Real connectivity check, triggered by the dashboard's "Check LMS
// connection" button (via lmsCheckRequests) — not just "is the env var
// set", but an actual authenticated call against the live LMS, the same
// as a human clicking around would confirm it works.
async function checkLmsConnection() {
  if (!LMS_BASE_URL || !LMS_API_KEY) {
    return { ok: false, message: "Not configured", detail: "LMS_BASE_URL/LMS_API_KEY aren't set on this service." };
  }
  try {
    const courses = await lmsListCourses();
    return { ok: true, message: "Connected", detail: `${courses.length} course${courses.length === 1 ? "" : "s"} visible.` };
  } catch (err) {
    return { ok: false, message: "Request failed", detail: String(err.message || err) };
  }
}

// Finds pending enrollments whose student name/email and (optionally)
// course title loosely match what was typed on WhatsApp. This is the only
// LMS lookup that can resolve a *specific* enrollment by name today — the
// student-search endpoint returns course/batch IDs a student is in, not
// enrollment IDs, so "remove"/"approve"/"reject" all key off this pending
// list. That means remove only ever finds a match for a still-pending
// enrollment; removing an already-active student's access by name isn't
// possible yet (the LMS would need to expose a lookup for those too).
async function findMatchingPendingEnrollments(studentQuery, courseQuery) {
  const pending = await lmsListPendingEnrollments();
  const sq = studentQuery.trim().toLowerCase();
  const cq = courseQuery?.trim().toLowerCase();
  return pending.filter((e) => {
    const nameMatch =
      e.userName?.toLowerCase().includes(sq) || e.userEmail?.toLowerCase().includes(sq);
    if (!nameMatch) return false;
    if (!cq) return true;
    return e.courseTitle?.toLowerCase().includes(cq);
  });
}

function describeAmbiguousMatches(matches) {
  return matches
    .map((e) => `${e.userName} (${e.userEmail}) — ${e.courseTitle}`)
    .join("\n");
}

// "check enrollments" — lists what's actually pending, formatted so each
// line has what approve/reject/remove need to resolve it unambiguously.
async function handleListPendingCommand() {
  const pending = await lmsListPendingEnrollments();
  if (pending.length === 0) {
    return "No pending enrollments right now.";
  }
  const lines = pending
    .slice(0, 20)
    .map((e) => `• ${e.userName} (${e.userEmail}) — ${e.courseTitle} (${e.batchName})`);
  const suffix = pending.length > 20 ? `\n…and ${pending.length - 20} more.` : "";
  return `${pending.length} pending enrollment${pending.length === 1 ? "" : "s"}:\n${lines.join("\n")}${suffix}`;
}

// "check student <name/email/phone>" — a direct lookup, not tied to a
// pending request. The students endpoint only returns course/batch IDs,
// not titles, so this reports counts rather than making extra round-trips
// to resolve names for what's meant to be a quick lookup.
async function handleFindStudentCommand(query) {
  if (!query) {
    return "Who should I look up? Give me a name, email, or phone number — e.g. \"check student nimal@email.com\".";
  }
  const students = await lmsFindStudents(query);
  if (students.length === 0) {
    return `Couldn't find a student matching "${query}".`;
  }
  if (students.length === 1) {
    const s = students[0];
    return `${s.name} (${s.email}${s.contact ? `, ${s.contact}` : ""}) — enrolled in ${s.enrolledCourses?.length || 0} course${s.enrolledCourses?.length === 1 ? "" : "s"}, ${s.enrolledBatches?.length || 0} batch${s.enrolledBatches?.length === 1 ? "" : "es"}.`;
  }
  const lines = students.map((s) => `• ${s.name} (${s.email})`);
  return `Found ${students.length} students matching "${query}":\n${lines.join("\n")}`;
}

// Matches a catalog course against whatever an admin actually typed —
// loose on purpose, since "the AI diploma course" or "AI diploma with
// their emails" are both plausible and neither is a clean substring of
// the real title "AI Diploma" (nor vice versa, in the first case).
function resolveCourseByName(courses, query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const exact = courses.find((c) => c.title.toLowerCase() === q);
  if (exact) return exact;

  const contains = courses.find((c) => {
    const title = c.title.toLowerCase();
    return q.includes(title) || title.includes(q);
  });
  if (contains) return contains;

  // Last resort: every meaningful word in what was typed shows up
  // somewhere in the title, so filler words ("the", "course") don't
  // block a match that's otherwise obvious.
  const stopwords = new Set(["the", "a", "an", "course", "courses", "program", "programme", "class"]);
  const qWords = q.split(/\s+/).filter((w) => w && !stopwords.has(w));
  if (qWords.length === 0) return null;
  return courses.find((c) => qWords.every((w) => c.title.toLowerCase().includes(w))) || null;
}

// Strips an "each/all/by/per batch" clause the admin worked into the
// course name itself ("each batch of AI diploma", "AI diploma by batch"),
// leaving just the course — the clause is what sets `byBatch`, handled
// separately in parseCourseRosterRequest.
function stripBatchPhrase(s) {
  return s
    .replace(/^(?:by|per|for|in|on)?\s*(?:each|all)?\s*batche?s?\s*(?:of\s+)?/i, "")
    .replace(/\s*(?:by|per|for|in|on)?\s*(?:each|all)?\s*batche?s?\s*$/i, "")
    .trim();
}

// Strips a trailing "with (their) emails/contacts/numbers/names" clause —
// admins often tack the fields they want onto the end of the course name
// itself ("AI diploma with their emails and contact numbers"), which isn't
// part of the course and would otherwise block the lookup.
function stripTrailingDetailsRequest(s) {
  let prev;
  let curr = s;
  do {
    prev = curr;
    curr = curr
      .replace(/\s+(?:with|and)\s+(?:their|the)?\s*(?:emails?|contacts?|phone\s*numbers?|contact\s*numbers?|numbers?|names?)\s*$/i, "")
      .trim();
  } while (curr !== prev);
  return curr;
}

// "list students in <course>" / "list students on each batch of <course>"
// — resolves the course by name against the cached catalog, then pulls the
// real roster (names/emails/contacts) from the LMS's course-roster
// endpoint, optionally grouped per batch.
async function handleCourseRosterCommand(courseQuery, byBatch) {
  const courses = await getLmsCoursesCached();
  if (!courseQuery) {
    const names = courses.slice(0, 8).map((c) => `"${c.title}"`).join(", ");
    return `Which course? ${names ? `We currently offer: ${names}.` : "I don't have a course list to check against right now."}`;
  }

  const course = resolveCourseByName(courses, courseQuery);
  if (!course) {
    return `Couldn't find a course matching "${courseQuery}" — ask me what courses we offer if you're not sure of the exact name.`;
  }

  const { students, count, nextCursor } = await lmsCourseRoster(course.id);
  if (count === 0) {
    return `No active students in "${course.title}" right now.`;
  }

  if (byBatch) {
    const byBatchMap = new Map();
    for (const s of students) {
      const key = s.batchName || "(no batch)";
      if (!byBatchMap.has(key)) byBatchMap.set(key, []);
      byBatchMap.get(key).push(s);
    }
    const sections = [...byBatchMap.entries()].map(([batchName, group]) => {
      const lines = group
        .slice(0, 40)
        .map((s) => `  • ${s.name || "(no name)"} — ${s.email || "no email"}${s.contact ? `, ${s.contact}` : ""}`);
      return `${batchName} (${group.length}):\n${lines.join("\n")}`;
    });
    const suffix = nextCursor
      ? "\n\n…more beyond this page — ask again narrowed to a specific batch if you need the rest."
      : "";
    return (
      `"${course.title}" — ${count} student${count === 1 ? "" : "s"} across ${byBatchMap.size} ` +
      `batch${byBatchMap.size === 1 ? "" : "es"}:\n\n${sections.join("\n\n")}${suffix}`
    );
  }

  const lines = students
    .slice(0, 40)
    .map(
      (s) =>
        `• ${s.name || "(no name)"} — ${s.email || "no email"}${s.contact ? `, ${s.contact}` : ""} (${s.batchName})`
    );
  const suffix =
    count > lines.length
      ? `\n…and ${count - lines.length} more.`
      : nextCursor
        ? "\n…more beyond this page — ask again narrowed to a specific batch if you need the rest."
        : "";
  return `${count} student${count === 1 ? "" : "s"} in "${course.title}":\n${lines.join("\n")}${suffix}`;
}

// --- Guided enroll / transfer flows -------------------------------------
// A multi-step, menu-driven version of "enroll"/"change batch" — pick a
// course, then a batch, then confirm — instead of needing the exact
// course/batch name typed in one line. State lives per-admin in memory
// (not Firestore: short-lived, fine to lose on a redeploy) with a timeout
// so an abandoned flow can't linger forever.
const ENROLL_FLOW_TTL_MS = 10 * 60 * 1000;
const enrollFlows = new Map(); // senderJid -> flow state

function clearFlow(jid) {
  enrollFlows.delete(jid);
}

function getActiveFlow(jid) {
  const flow = enrollFlows.get(jid);
  if (!flow) return null;
  if (Date.now() - flow.updatedAt > ENROLL_FLOW_TTL_MS) {
    enrollFlows.delete(jid);
    return null;
  }
  return flow;
}

function setFlow(jid, flow) {
  flow.updatedAt = Date.now();
  enrollFlows.set(jid, flow);
}

// Accepts a number ("2") against the shown menu, or a typed name as a
// case-insensitive partial match — whichever the admin actually sends.
function resolveMenuChoice(text, items, labelFn) {
  const trimmed = text.trim();
  const n = parseInt(trimmed, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= items.length && /^\d+$/.test(trimmed)) {
    return items[n - 1];
  }
  const q = trimmed.toLowerCase();
  return items.find((it) => labelFn(it).toLowerCase().includes(q)) || null;
}

function renderCourseMenu(courses) {
  const lines = courses.map((c, i) => `${i + 1}. ${c.title}${c.category ? ` (${c.category})` : ""}`);
  return `Which course?\n${lines.join("\n")}\n\nReply with a number, or "cancel".`;
}

function renderBatchMenu(course, batches) {
  const lines = batches.map(
    (b, i) => `${i + 1}. ${b.name} (${b.status}${b.maxStudents ? `, ${b.enrolledCount}/${b.maxStudents}` : ""})`
  );
  return `"${course.title}" — which batch?\n${lines.join("\n")}\n\nReply with a number, or "cancel".`;
}

function renderConfirmation(flow) {
  const verb = flow.type === "transfer" ? "Move" : "Enroll";
  const prep = flow.type === "transfer" ? "to" : "in";
  const note =
    flow.type === "transfer"
      ? "\n\n(Their current enrollment in this course will be closed out as part of the move.)"
      : "";
  return `${verb} ${flow.studentName} (${flow.studentEmail}) ${prep} "${flow.selectedCourse.title}" — ${flow.selectedBatch.name}?${note}\n\nReply YES to confirm or NO to cancel.`;
}

const CANCEL_WORDS = /^(cancel|stop|nevermind|never mind)$/i;
const YES_WORDS = /^(yes|y|confirm|ok|okay|sure)$/i;
const NO_WORDS = /^(no|n)$/i;

async function advanceToConfirmationOrBatchMenu(activeSock, remoteJid, senderJid, flow, course) {
  const openBatches = (course.batches || []).filter((b) => b.status === "open" || b.status === "ongoing");
  if (openBatches.length === 0) {
    clearFlow(senderJid);
    const text = `"${course.title}" has no open batch right now. Cancelled.`;
    await activeSock.sendMessage(remoteJid, { text });
    remember(remoteJid, "assistant", text);
    return;
  }
  flow.selectedCourse = course;
  if (openBatches.length === 1) {
    flow.selectedBatch = openBatches[0];
    flow.step = "awaiting_confirmation";
    setFlow(senderJid, flow);
    const text = renderConfirmation(flow);
    await activeSock.sendMessage(remoteJid, { text });
    remember(remoteJid, "assistant", text);
    return;
  }
  flow.batches = openBatches;
  flow.step = "awaiting_batch";
  setFlow(senderJid, flow);
  const text = renderBatchMenu(course, openBatches);
  await activeSock.sendMessage(remoteJid, { text });
  remember(remoteJid, "assistant", text);
}

async function startEnrollFlow(activeSock, remoteJid, senderJid, email, adminPhoneNumber) {
  const students = await lmsFindStudents(email);
  if (students.length === 0) return `Couldn't find a student with email "${email}".`;
  if (students.length > 1) {
    return `Found ${students.length} matches for "${email}" — that shouldn't happen for an exact email. Try "check student ${email}" first.`;
  }
  const student = students[0];
  const courses = await getLmsCoursesCached();
  if (courses.length === 0) return "No courses are published right now.";

  const flow = {
    type: "enroll",
    step: "awaiting_course",
    studentId: student.id,
    studentEmail: student.email,
    studentName: student.name,
    courses,
    adminPhoneNumber,
  };
  setFlow(senderJid, flow);
  return renderCourseMenu(courses);
}

async function startTransferFlow(activeSock, remoteJid, senderJid, email, adminPhoneNumber) {
  const students = await lmsFindStudents(email);
  if (students.length === 0) return `Couldn't find a student with email "${email}".`;
  if (students.length > 1) {
    return `Found ${students.length} matches for "${email}" — that shouldn't happen for an exact email. Try "check student ${email}" first.`;
  }
  const student = students[0];
  const allCourses = await getLmsCoursesCached();
  const enrolledIds = new Set(student.enrolledCourses || []);
  const courses = allCourses.filter((c) => enrolledIds.has(c.id));
  if (courses.length === 0) {
    return `${student.name} isn't enrolled in any course yet — use "enroll this student ${email}" instead.`;
  }

  const flow = {
    type: "transfer",
    step: "awaiting_course",
    studentId: student.id,
    studentEmail: student.email,
    studentName: student.name,
    courses,
    adminPhoneNumber,
  };

  if (courses.length === 1) {
    setFlow(senderJid, flow);
    await advanceToConfirmationOrBatchMenu(activeSock, remoteJid, senderJid, flow, courses[0]);
    return null; // already sent its own message
  }

  setFlow(senderJid, flow);
  return renderCourseMenu(courses);
}

/** Intercepts a message from an admin who has an active guided flow —
 * returns true if it handled the message (so normal command dispatch is
 * skipped), false otherwise. A message that matches a *different* real
 * command abandons the stale flow instead of getting stuck waiting for a
 * menu reply that will never come. */
async function handleActiveFlowMessage(activeSock, remoteJid, senderJid, askText) {
  const flow = getActiveFlow(senderJid);
  if (!flow) return false;

  if (parseEnrollmentCommand(askText)) {
    clearFlow(senderJid);
    return false;
  }

  const trimmed = askText.trim();
  if (CANCEL_WORDS.test(trimmed)) {
    clearFlow(senderJid);
    const text = "Cancelled.";
    await activeSock.sendMessage(remoteJid, { text });
    remember(remoteJid, "assistant", text);
    return true;
  }

  if (flow.step === "awaiting_course") {
    const course = resolveMenuChoice(trimmed, flow.courses, (c) => c.title);
    if (!course) {
      const text = `Didn't catch that — reply with a number from the list, or "cancel".`;
      await activeSock.sendMessage(remoteJid, { text });
      return true;
    }
    await advanceToConfirmationOrBatchMenu(activeSock, remoteJid, senderJid, flow, course);
    return true;
  }

  if (flow.step === "awaiting_batch") {
    const batch = resolveMenuChoice(trimmed, flow.batches, (b) => b.name);
    if (!batch) {
      const text = `Didn't catch that — reply with a number from the list, or "cancel".`;
      await activeSock.sendMessage(remoteJid, { text });
      return true;
    }
    flow.selectedBatch = batch;
    flow.step = "awaiting_confirmation";
    setFlow(senderJid, flow);
    const text = renderConfirmation(flow);
    await activeSock.sendMessage(remoteJid, { text });
    remember(remoteJid, "assistant", text);
    return true;
  }

  if (flow.step === "awaiting_confirmation") {
    if (YES_WORDS.test(trimmed)) {
      clearFlow(senderJid);
      await sendWorkingNotice(activeSock, remoteJid, "🔎 Checking the LMS…");
      try {
        const { enrollment } =
          flow.type === "transfer"
            ? await lmsTransfer(
                flow.studentId,
                flow.selectedCourse.id,
                flow.selectedCourse.id,
                flow.selectedBatch.id,
                flow.adminPhoneNumber
              )
            : await lmsGrant(flow.studentId, flow.selectedCourse.id, flow.selectedBatch.id, flow.adminPhoneNumber);
        const verb = flow.type === "transfer" ? "Moved" : "Enrolled";
        const prep = flow.type === "transfer" ? "to" : "in";
        const text = `${verb}: ${enrollment?.userName || flow.studentName} is now ${prep} ${enrollment?.courseTitle || flow.selectedCourse.title} — ${enrollment?.batchName || flow.selectedBatch.name}.`;
        await activeSock.sendMessage(remoteJid, { text });
        remember(remoteJid, "assistant", text);
        await db
          .collection("activity")
          .add({
            title: `LMS ${flow.type === "transfer" ? "batch transfer" : "enrollment"} via WhatsApp`,
            detail: `${flow.studentEmail} → ${flow.selectedCourse.title} (${flow.selectedBatch.name})`,
            type: "ok",
            createdAt: Date.now(),
          })
          .catch(() => {});
      } catch (err) {
        console.error("Guided enroll/transfer failed:", err);
        const errText = `Couldn't finish that — ${err.message || "something went wrong"}.`;
        await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
        remember(remoteJid, "assistant", errText);
      }
      return true;
    }
    if (NO_WORDS.test(trimmed)) {
      clearFlow(senderJid);
      const text = "Cancelled.";
      await activeSock.sendMessage(remoteJid, { text });
      remember(remoteJid, "assistant", text);
      return true;
    }
    const text = "Reply YES to confirm or NO to cancel.";
    await activeSock.sendMessage(remoteJid, { text });
    return true;
  }

  return false;
}

// approve / reject / remove all key off the same pending-enrollment lookup
// (see findMatchingPendingEnrollments) — remove only resolves a *pending*
// request this way; removing an already-active student by name isn't
// possible from WhatsApp yet.
async function handlePendingEnrollmentCommand(cmd, adminPhoneNumber) {
  const courseQuery = cmd.action === "approve" || cmd.action === "remove" ? cmd.course : null;
  const matches = await findMatchingPendingEnrollments(cmd.student, courseQuery);

  if (matches.length === 0) {
    return cmd.action === "remove"
      ? `Couldn't find a pending request matching "${cmd.student}"${cmd.course ? ` for "${cmd.course}"` : ""} — removing an already-active student by name isn't supported from WhatsApp yet.`
      : `Couldn't find a pending enrollment request matching "${cmd.student}"${cmd.course ? ` for "${cmd.course}"` : ""}.`;
  }
  if (matches.length > 1) {
    return `Found ${matches.length} matching pending requests — which one?\n${describeAmbiguousMatches(matches)}`;
  }

  const match = matches[0];
  if (cmd.action === "approve") {
    const { enrollment } = await lmsApprove(match.id, adminPhoneNumber);
    return `Approved: ${enrollment?.userName || match.userName} for ${enrollment?.courseTitle || match.courseTitle} (${enrollment?.batchName || match.batchName}).`;
  }
  if (cmd.action === "reject") {
    const { enrollment } = await lmsReject(match.id, adminPhoneNumber, cmd.detail);
    return `Rejected: ${enrollment?.userName || match.userName} for ${enrollment?.courseTitle || match.courseTitle}${cmd.detail ? ` (${cmd.detail})` : ""}.`;
  }
  // remove
  await lmsRemove(match.id, adminPhoneNumber, false);
  return `Removed: ${match.userName}'s access to ${match.courseTitle} (${match.batchName}).`;
}

// "enroll <student> in <course>" — resolves a student and a course+batch,
// then grants immediate access (skips the pending step entirely).
async function handleEnrollCommand(cmd, adminPhoneNumber) {
  const students = await lmsFindStudents(cmd.student);
  if (students.length === 0) {
    return `Couldn't find a student matching "${cmd.student}".`;
  }
  if (students.length > 1) {
    const list = students.map((s) => `${s.name} (${s.email})`).join("\n");
    return `Found ${students.length} students matching "${cmd.student}" — which one? Try again with their email.\n${list}`;
  }
  const student = students[0];

  const courses = await lmsListCourses();
  const cq = cmd.course.trim().toLowerCase();
  const courseMatches = courses.filter((c) => c.title?.toLowerCase().includes(cq));
  if (courseMatches.length === 0) {
    return `Couldn't find a course matching "${cmd.course}".`;
  }
  if (courseMatches.length > 1) {
    return `Found ${courseMatches.length} courses matching "${cmd.course}" — which one?\n${courseMatches.map((c) => c.title).join("\n")}`;
  }
  const course = courseMatches[0];

  const openBatches = (course.batches || []).filter((b) => b.status === "open" || b.status === "ongoing");
  if (openBatches.length === 0) {
    return `"${course.title}" has no open batch to enroll into right now.`;
  }
  // If the course text also named a batch ("... January 2026 Intake"), prefer that match.
  const namedBatch = openBatches.find((b) => cq.includes(b.name.toLowerCase()));
  const batch = namedBatch || (openBatches.length === 1 ? openBatches[0] : null);
  if (!batch) {
    return `"${course.title}" has ${openBatches.length} open batches — which one?\n${openBatches.map((b) => b.name).join("\n")}`;
  }

  await lmsGrant(student.id, course.id, batch.id, adminPhoneNumber);
  return `Enrolled: ${student.name} in ${course.title} (${batch.name}).`;
}

// --- WhatsApp admin permissions -----------------------------------------
// A small, privileged set of numbers (managed only from the dashboard —
// see firestore.rules) allowed to run admin-only commands on WhatsApp,
// like approving a student's enrollment. Everything else LEO does on
// WhatsApp stays open to anyone who can message him; this is specifically
// for the subset of actions that shouldn't be, now that students are
// going to have access too. Kept in memory via a live listener rather than
// an expiring cache — the list is small and changes rarely, so there's no
// real cost to always being current.
const adminJids = new Set();
WHATSAPP_ADMINS.onSnapshot(
  (snap) => {
    adminJids.clear();
    snap.docs.forEach((d) => adminJids.add(d.id));
  },
  (err) => console.error("Failed to watch whatsappAdmins:", err)
);

function isWhatsAppAdmin(jid) {
  return adminJids.has(jid);
}

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends a quick "working on it" message before a genuinely slow operation
 * (image generation, a network round-trip to another service, voice
 * synthesis) so the chat doesn't just go silent for several seconds —
 * same reason a person says "hang on, checking" instead of leaving you on
 * read. Never awaited by the caller's own timing — fire-and-forget other
 * than the WhatsApp send itself. */
async function sendWorkingNotice(activeSock, jid, text) {
  try {
    await activeSock.sendMessage(jid, { text });
    await activeSock.sendPresenceUpdate("composing", jid).catch(() => {});
  } catch (err) {
    console.error("Failed to send working notice:", err);
  }
}

/** Sends a reply as more than one WhatsApp message when it naturally reads
 * as separate thoughts (blank-line-separated paragraphs) — the way a
 * person continuing a conversation sends a couple of messages in a row
 * instead of one big block of text. Capped at 4 messages so a long reply
 * doesn't turn into a flood, and falls back to a single message outside
 * that range. */
async function sendAsMessages(activeSock, jid, text) {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks = parts.length > 1 && parts.length <= 4 ? parts : [text];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await activeSock.sendPresenceUpdate("composing", jid).catch(() => {});
      await delay(500 + Math.random() * 500);
    }
    await activeSock.sendMessage(jid, { text: chunks[i] });
  }
}

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

    if (LMS_BASE_URL && LMS_API_KEY) {
      const courses = await getLmsCoursesCached();
      const courseContext = formatCourseContext(courses);
      if (courseContext) lines.push(`\n${courseContext}`);
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

const BASE_HELP_LINES = [
  "Here's what I can do here on WhatsApp:",
  "",
  "• Just talk to me normally — ask questions, request a task, etc. Mention a new lead or something to track and I'll log it automatically.",
  '• "poster: <description>" or "flyer of <description>" — I’ll generate an image (attach or reply to a photo to use it as a style reference).',
  '• "remind me in 20 minutes to <note>" or "remind me tomorrow at 9am to <note>" — I’ll DM you back at that time.',
  '• "tell group <name>: <message>" — sends to that group now, or schedules it if you include a time.',
  '• "poll: <question>? <option>, <option>, ..." — sends a poll to this chat.',
  '• "write a document about <topic>" / "document: <topic>" / "report on <topic>" — I\'ll research it (live web search when I can) and send back a properly designed PDF. Then "update the document to also include..." / "add X to that document" revises and re-sends it.',
  '• "remember that <fact>" — teaches me something to keep in mind going forward.',
  '• "what do you remember about me" / "forget about me" — check or clear what I know about you.',
  "• Send a voice note, photo, or document (PDF) and I'll read/listen and respond — works as a reply to earlier media too. Send a voice note and I'll reply with one too; say \"reply with voice\" anytime to get a voice note back.",
];

const ADMIN_HELP_LINES = [
  "",
  "Admin-only (your number has this — LMS actions):",
  '• "check enrollments" — lists what\'s actually pending right now.',
  '• "check student <name/email/phone>" — looks up a student directly.',
  '• "approve <student> [for <course>]" / "reject <student>[: <reason>]" — decides a pending enrollment request.',
  '• "enroll <student> in <course>" — grants immediate course/batch access, skipping the pending step.',
  '• "remove <student> from <course>" — bans their pending request (doesn\'t touch an already-active student yet).',
  '• "enroll this student <email>" — guided flow: pick a course, pick a batch, confirm, done.',
  '• "change/move/transfer <email>\'s batch" — guided flow to move them to a different batch, closing out the old enrollment as part of the same move.',
  '• "list students in <course>" — full roster with names, emails, and contacts; add "by batch"/"each batch" to break it down per batch instead of one flat list.',
];

// Admin commands only show up in the help text for admins — a student
// seeing a list of things they can't actually use would just be
// confusing (or an invitation to try anyway).
function helpTextFor(jid) {
  const lines = [...BASE_HELP_LINES];
  if (isWhatsAppAdmin(jid)) lines.push(...ADMIN_HELP_LINES);
  lines.push("", "In the company group, say “Leo” so I know you're talking to me.");
  return lines.join("\n");
}

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

// --- Admin-only: LMS enrollment commands -------------------------------
// Gated on isWhatsAppAdmin at dispatch time, not just by who happens to
// know the phrasing. Each wraps a real /api/leo/* route in the LMS —
// see the "LEO <-> SmartLabs LMS" integration doc for the full contract.
const APPROVE_PATTERN = /^\s*approve\s+(.+?)(?:\s+for\s+(.+))?\s*$/i;
const REJECT_PATTERN = /^\s*reject\s+(.+?)(?:\s*[:\-]\s*(.+))?\s*$/i;
const ENROLL_PATTERN = /^\s*(?:enroll|grant)\s+(.+?)\s+(?:in|into|for|access to)\s+(.+?)\s*$/i;
const REMOVE_PATTERN = /^\s*remove\s+(.+?)\s+from\s+(.+?)\s*$/i;
// "check enrollments" / "list pending enrollments" / "show enrollments" —
// lists what's actually waiting for a decision. Checked first since it
// takes no student/course argument and the other patterns wouldn't match
// this phrasing anyway.
const CHECK_ENROLLMENTS_PATTERN = /^\s*(?:check|list|show)\s+(?:the\s+)?(?:pending\s+)?enrollments?\b/i;
// "check student <name/email/phone>" / "find student ..." / "look up
// student's email ..." — a direct student lookup, independent of
// enrollments. The capture group is whatever's left after "student(s)",
// which may be empty ("check students") if no identifier was given.
const CHECK_STUDENT_PATTERN = /^\s*(?:check|find|look\s*up|search(?:\s+for)?)\s+(?:the\s+)?student('s)?s?\s*(.*)$/i;
// "enroll this student <email>" / "enroll student: <email>" — the guided
// menu flow, as opposed to ENROLL_PATTERN's one-line "enroll X in Y" form.
// Checked only after ENROLL_PATTERN fails, so a course-specifying command
// is never mistaken for this one.
const GUIDED_ENROLL_PATTERN = /^\s*enroll\s+(?:this\s+)?student\s*[:\-]?\s*(\S+@\S+\.\S+)\s*$/i;
// "change <email> batch" / "move <email> to another batch" / "transfer
// student <email>" — the guided batch-change flow. Requires the word
// "batch" to be present so it doesn't fire on unrelated sentences.
const TRANSFER_PATTERN = /^\s*(?:change|move|transfer)\b(?=.*\bbatch\b).*?(\S+@\S+\.\S+)/i;
// "list/show/get/give/send (me) (the) students (list) in/of/for/on
// <course>" — a full roster request, resolved via the LMS's course-roster
// endpoint (see handleCourseRosterCommand). Not anchored to the start and
// not fussy about the exact verb, since admins ask for this many
// different ways — but it does require the plural "students" (a singular
// "student" is CHECK_STUDENT_PATTERN's territory, a single lookup).
const COURSE_ROSTER_PATTERN = /\bstudents\b[\s\w]{0,25}?\b(?:in|of|for|on)\s+(.+?)\s*$/i;
// Any mention of "batch"/"batches" in a roster request means "break this
// down per batch" rather than one flat list.
const BY_BATCH_HINT_PATTERN = /\bbatch(?:es)?\b/i;

function parseCourseRosterRequest(text) {
  const match = text.match(COURSE_ROSTER_PATTERN);
  if (!match) return null;
  const byBatch = BY_BATCH_HINT_PATTERN.test(text);
  const course = stripTrailingDetailsRequest(stripBatchPhrase(match[1].trim()));
  return { course: course || null, byBatch };
}

function parseEnrollmentCommand(text) {
  if (CHECK_ENROLLMENTS_PATTERN.test(text)) {
    return { action: "list" };
  }
  const rosterMatch = parseCourseRosterRequest(text);
  if (rosterMatch) {
    return { action: "course_roster", course: rosterMatch.course, byBatch: rosterMatch.byBatch };
  }
  const studentMatch = text.match(CHECK_STUDENT_PATTERN);
  if (studentMatch) {
    return { action: "find_student", query: studentMatch[2].replace(/^(?:email|contact|phone)\s*/i, "").trim() };
  }
  const approveMatch = text.match(APPROVE_PATTERN);
  if (approveMatch) {
    return { action: "approve", student: approveMatch[1].trim(), course: approveMatch[2]?.trim() || null };
  }
  const rejectMatch = text.match(REJECT_PATTERN);
  if (rejectMatch) {
    return { action: "reject", student: rejectMatch[1].trim(), detail: rejectMatch[2]?.trim() || null };
  }
  const enrollMatch = text.match(ENROLL_PATTERN);
  if (enrollMatch) {
    return { action: "enroll", student: enrollMatch[1].trim(), course: enrollMatch[2].trim() };
  }
  const removeMatch = text.match(REMOVE_PATTERN);
  if (removeMatch) {
    return { action: "remove", student: removeMatch[1].trim(), course: removeMatch[2].trim() };
  }
  const transferMatch = text.match(TRANSFER_PATTERN);
  if (transferMatch) {
    return { action: "start_transfer", email: transferMatch[1] };
  }
  const guidedEnrollMatch = text.match(GUIDED_ENROLL_PATTERN);
  if (guidedEnrollMatch) {
    return { action: "start_enroll", email: guidedEnrollMatch[1] };
  }
  return null;
}

const NOT_ADMIN_TEXT =
  "You don't have admin access for that — ask the developer to grant it to your number from the dashboard.";

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

// --- Document generation -------------------------------------------------
// Anyone (not just admins) can ask LEO to research a topic — from whatever
// was said in this chat/group, or anything else — and get back an actual
// document, instead of just a chat reply. The research itself happens on
// the website side (generateDocument in llmRouter.ts, grounded with Google
// Search when the model supports it); this worker's job is turning the
// Markdown that comes back into a real PDF file to send.

// "document: <topic>" / "report: <topic>" / "pdf: <topic>" shorthand, same
// style as poster: — optionally with an "on/about/for" lead-in before the
// colon too ("report on: Q3 numbers").
const DOCUMENT_SHORTHAND_PATTERN =
  /\b(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b\s*(?:on|about|for|regarding)?\s*[:\-]\s*(.+)/i;
// "document/report/pdf about/on/for <topic>" — the most natural phrasing,
// with or without a leading verb ("write a document about X", "give me a
// report on X", or just "document about X" / "I need a document about X").
const DOCUMENT_TOPIC_PATTERN =
  /\b(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b\s+(?:on|about|for|regarding)\s+(.+)/i;
// "write/make/create/prepare/draft/generate/give (me)/send (me) a
// document/report/pdf <topic>" — no preposition needed, as long as a real
// creation verb actually led into it (so a bare mention of "the document"
// in ordinary conversation never matches).
const DOCUMENT_VERBOSE_PATTERN =
  /\b(?:write|make|create|prepare|draft|generate|give|send)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b\s*(?:on|about|for|regarding)?\s*[:\-]?\s*(.+)/i;
// "research <topic> and write/make a document/report" — the topic comes
// BEFORE the keyword here, not after, so it needs its own capture rather
// than falling through to the patterns above (which would find nothing
// after "report" and fail to match at all).
const DOCUMENT_RESEARCH_PREFIX_PATTERN =
  /\bresearch\s+(.+?)\s+and\s+(?:write|make|create|prepare|draft|generate)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b/i;

function parseDocumentRequest(text) {
  const researchMatch = text.match(DOCUMENT_RESEARCH_PREFIX_PATTERN);
  if (researchMatch && researchMatch[1].trim()) return researchMatch[1].trim();
  for (const pattern of [DOCUMENT_SHORTHAND_PATTERN, DOCUMENT_TOPIC_PATTERN, DOCUMENT_VERBOSE_PATTERN]) {
    const match = text.match(pattern);
    if (match && match[1].trim()) return match[1].trim();
  }
  return null;
}

// "add/include/remove/change/update X to/from/in that/this/the document" —
// the instruction comes BEFORE the keyword here, so it needs its own
// capture (same reasoning as DOCUMENT_RESEARCH_PREFIX_PATTERN above).
const DOCUMENT_UPDATE_PREFIX_PATTERN =
  /\b(?:add|include|remove|change|update)\s+(.+?)\s+(?:to|from|in)\s+(?:that|this|the)\s+(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b/i;
// "update/edit/revise/modify/redo/regenerate/change (that/this/the)
// document/report/pdf (to/with/and/:) <instruction>" — only fires on a
// real revision verb aimed at the document itself, so an unrelated
// mention ("update the drive link for the document") never matches.
const DOCUMENT_UPDATE_PATTERN =
  /\b(?:update|edit|revise|modify|redo|regenerate|change)\b.{0,20}?\b(?:that|this|the)?\s*(?:documents?|reports?|pdfs?|write-?ups?|articles?)\b\s*(?:to|with|and|[:\-])?\s*(.+)/i;

function parseDocumentUpdateRequest(text) {
  const prefixMatch = text.match(DOCUMENT_UPDATE_PREFIX_PATTERN);
  if (prefixMatch && prefixMatch[1].trim()) return prefixMatch[1].trim();
  const match = text.match(DOCUMENT_UPDATE_PATTERN);
  if (match && match[1].trim()) {
    const cleaned = match[1].trim().replace(/^[,\s:\-]+/, "").trim();
    return cleaned || null;
  }
  return null;
}

// The last document LEO generated or revised in each chat, so "update
// that document to also include X" has something to work from instead of
// starting over. Short-lived, in-memory, same pattern as enrollFlows —
// fine to lose on a redeploy, not worth persisting to Firestore.
const LAST_DOCUMENT_TTL_MS = 60 * 60 * 1000;
const lastDocumentByChat = new Map(); // remoteJid -> { title, markdown, sources, updatedAt }

function getLastDocument(remoteJid) {
  const doc = lastDocumentByChat.get(remoteJid);
  if (!doc) return null;
  if (Date.now() - doc.updatedAt > LAST_DOCUMENT_TTL_MS) {
    lastDocumentByChat.delete(remoteJid);
    return null;
  }
  return doc;
}

function setLastDocument(remoteJid, { title, markdown, sources }) {
  lastDocumentByChat.set(remoteJid, { title, markdown, sources: sources || [], updatedAt: Date.now() });
}

async function generateDocumentOnTopic(topic, context) {
  if (!WEB_BASE_URL) {
    throw new Error("LEO_WEB_BASE_URL is not set");
  }
  const res = await fetch(`${WEB_BASE_URL}/api/document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, context: context || undefined }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Document generation failed (HTTP ${res.status})`);
  }
  return res.json(); // { title, markdown, sources: [{title, url}] }
}

async function reviseDocumentOnTopic(previousMarkdown, instruction, context) {
  if (!WEB_BASE_URL) {
    throw new Error("LEO_WEB_BASE_URL is not set");
  }
  const res = await fetch(`${WEB_BASE_URL}/api/document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previousMarkdown, instruction, context: context || undefined }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Document revision failed (HTTP ${res.status})`);
  }
  return res.json(); // { title, markdown, sources: [{title, url}] }
}

function slugifyFileName(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document"
  );
}

const PDF_ACCENT = "#1a56db";
const PDF_ACCENT_LIGHT = "#dbeafe";
const PDF_TEXT_DARK = "#111827";
const PDF_TEXT_GRAY = "#6b7280";
const PDF_RULE_GRAY = "#e5e7eb";
const PDF_MARGIN = 56;

/** Turns LEO's researched Markdown into an actual designed PDF — a colored
 * cover band with the title, accent-colored section headings with a rule
 * under each, real hanging-indent bullets (a drawn dot, not a "• " text
 * prefix), a slim continuation header on any page after the first, and a
 * page-numbered footer. Not a full Markdown engine — a light hand-rolled
 * renderer, which is all a one-off research doc going out over WhatsApp
 * actually needs — but one that reads like someone laid it out on purpose
 * instead of pasting text onto a blank page. */
function renderDocumentPdf(title, markdown, sources) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PDF_MARGIN, bufferPages: true, info: { Title: title } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - PDF_MARGIN * 2;
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    // A slim continuation header on every page after the first — the cover
    // band below is deliberately only drawn once. "pageAdded" doesn't fire
    // for the very first page (pdfkit creates it inside the constructor,
    // before this listener is attached), so this only catches real overflow.
    doc.on("pageAdded", () => {
      doc.font("Helvetica").fontSize(9).fillColor(PDF_TEXT_GRAY);
      doc.text(title, PDF_MARGIN, 28, { width: contentWidth, lineBreak: false, ellipsis: true });
      doc
        .moveTo(PDF_MARGIN, 44)
        .lineTo(doc.page.width - PDF_MARGIN, 44)
        .strokeColor(PDF_RULE_GRAY)
        .lineWidth(0.5)
        .stroke();
      doc.x = PDF_MARGIN;
      doc.y = 60;
      doc.fillColor(PDF_TEXT_DARK);
    });

    // Cover band — first page only.
    doc.rect(0, 0, doc.page.width, 110).fill(PDF_ACCENT);
    doc.fillColor("white").font("Helvetica-Bold").fontSize(21).text(title, PDF_MARGIN, 36, { width: contentWidth });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(PDF_ACCENT_LIGHT)
      .text(`SmartLabs • Prepared by LEO • ${today}`, PDF_MARGIN, doc.y + 6);
    doc.fillColor(PDF_TEXT_DARK);
    doc.x = PDF_MARGIN;
    doc.y = 132;

    function drawBullet(text) {
      const textIndent = 14;
      const dotY = doc.y + 5.5;
      doc.save();
      doc.circle(PDF_MARGIN + 2.5, dotY, 2).fill(PDF_ACCENT);
      doc.restore();
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor(PDF_TEXT_DARK)
        .text(text, PDF_MARGIN + textIndent, doc.y, { width: contentWidth - textIndent, lineGap: 2 });
    }

    for (const rawLine of markdown.split("\n")) {
      const line = rawLine.trimEnd();
      if (/^#\s+/.test(line)) continue; // already rendered in the cover band above
      const clean = (s) => s.replace(/\*\*/g, "");
      if (/^##\s+/.test(line)) {
        doc.moveDown(0.7);
        const headingText = clean(line.replace(/^##\s+/, ""));
        doc.font("Helvetica-Bold").fontSize(14).fillColor(PDF_ACCENT).text(headingText, { width: contentWidth });
        const underlineY = doc.y + 1;
        doc
          .moveTo(PDF_MARGIN, underlineY)
          .lineTo(PDF_MARGIN + Math.min(doc.widthOfString(headingText) + 4, contentWidth), underlineY)
          .strokeColor(PDF_ACCENT)
          .lineWidth(1)
          .stroke();
        doc.moveDown(0.5);
        doc.fillColor(PDF_TEXT_DARK);
      } else if (/^#{3,}\s+/.test(line)) {
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").fontSize(12).fillColor(PDF_TEXT_DARK).text(clean(line.replace(/^#{3,}\s+/, "")), {
          width: contentWidth,
        });
        doc.moveDown(0.2);
      } else if (/^[-*]\s+/.test(line)) {
        drawBullet(clean(line.replace(/^[-*]\s+/, "")));
      } else if (!line.trim()) {
        doc.moveDown(0.45);
      } else {
        doc
          .font("Helvetica")
          .fontSize(11)
          .fillColor(PDF_TEXT_DARK)
          .text(clean(line), { width: contentWidth, lineGap: 2 });
      }
    }

    if (sources && sources.length > 0) {
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(13).fillColor(PDF_ACCENT).text("Sources", { width: contentWidth });
      doc.moveDown(0.3);
      for (const s of sources) {
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(PDF_ACCENT)
          .text(s.title || s.url, { link: s.url, underline: true, width: contentWidth });
      }
      doc.fillColor(PDF_TEXT_DARK);
    }

    // Page-numbered footer on every page, added last via bufferPages so the
    // total page count is already known. Writing this low on the page sits
    // below pdfkit's own bottom-margin boundary, which would otherwise read
    // it as an overflow and silently add a trailing blank page — dropping
    // the bottom margin to 0 for just these calls avoids that.
    const range = doc.bufferedPageRange();
    const savedBottomMargin = doc.page.margins.bottom;
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      const bottom = doc.page.height - 36;
      doc.font("Helvetica").fontSize(8).fillColor(PDF_TEXT_GRAY);
      doc.text("SmartLabs • Generated by LEO", PDF_MARGIN, bottom, { width: 220, lineBreak: false });
      doc.text(`Page ${i - range.start + 1} of ${range.count}`, doc.page.width - PDF_MARGIN - 150, bottom, {
        width: 150,
        align: "right",
        lineBreak: false,
      });
      doc.page.margins.bottom = savedBottomMargin;
    }

    doc.end();
  });
}

// --- Voice replies ----------------------------------------------------
// Gemini's TTS returns raw 16-bit PCM, not something WhatsApp can play as
// a voice note directly — WhatsApp's "ptt" voice bubble specifically wants
// OGG/Opus. ffmpeg-static bundles its own ffmpeg binary, so this works on
// Railway without needing a system package. Verified end-to-end (the real
// Gemini TTS call, the PCM, and this exact ffmpeg conversion) before
// shipping; the one thing that couldn't be verified from here is how it
// actually plays back on a phone, same caveat as the rest of this bridge.
function pcmToOggOpus(pcmBuffer, sampleRate) {
  return new Promise((resolve, reject) => {
    const args = [
      "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", "pipe:0",
      "-c:a", "libopus", "-ar", "16000", "-ac", "1", "-application", "voip",
      "-f", "ogg", "pipe:1",
    ];
    const proc = spawn(ffmpegPath, args);
    const chunks = [];
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.stdin.write(pcmBuffer);
    proc.stdin.end();
  });
}

async function synthesizeVoiceReply(text) {
  if (!WEB_BASE_URL) return null;
  try {
    const res = await fetch(`${WEB_BASE_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.audio) return null;
    const pcm = Buffer.from(data.audio, "base64");
    return await pcmToOggOpus(pcm, data.sampleRate || 24000);
  } catch (err) {
    console.error("Voice reply synthesis failed:", err);
    return null;
  }
}

// Asking for a voice reply explicitly, in either language's phrasing.
const VOICE_REQUEST_PATTERN =
  /\b(voice reply|reply (?:with|in) (?:a )?voice|say (?:that|it) (?:as a voice|out loud)|send (?:that|it)? ?as (?:a )?voice (?:note|message))\b/i;

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

    // An admin mid guided-enroll/transfer flow gets intercepted here, before
    // any of the regular command parsing below — their numbered replies
    // ("2", "yes", "cancel") aren't meant for the general dispatch chain.
    if (isWhatsAppAdmin(senderJid)) {
      const flowHandled = await handleActiveFlowMessage(activeSock, remoteJid, senderJid, askText);
      if (flowHandled) {
        await activeSock.sendPresenceUpdate("paused", remoteJid).catch(() => {});
        return;
      }
    }

        const rememberMatch = askText.match(REMEMBER_PATTERN);
        const whatRemember = !rememberMatch && WHAT_REMEMBER_PATTERN.test(askText);
        const forgetMe = !rememberMatch && !whatRemember && FORGET_ME_PATTERN.test(askText);
        const enrollmentCommand =
          !rememberMatch && !whatRemember && !forgetMe ? parseEnrollmentCommand(askText) : null;
        const pollMatch =
          !rememberMatch && !whatRemember && !forgetMe && !enrollmentCommand ? parsePoll(askText) : null;
        const posterMatch =
          !rememberMatch && !whatRemember && !forgetMe && !enrollmentCommand && !pollMatch
            ? askText.match(POSTER_PATTERN)
            : null;
        // Only treated as a revision request when there's actually a
        // document to revise in this chat — otherwise an unrelated
        // sentence that happens to say "update the document" just falls
        // through to normal chat instead of hijacking it.
        const documentUpdateInstruction =
          !rememberMatch && !whatRemember && !forgetMe && !enrollmentCommand && !pollMatch && !posterMatch && getLastDocument(remoteJid)
            ? parseDocumentUpdateRequest(askText)
            : null;
        const documentTopic =
          !rememberMatch &&
          !whatRemember &&
          !forgetMe &&
          !enrollmentCommand &&
          !pollMatch &&
          !posterMatch &&
          !documentUpdateInstruction
            ? parseDocumentRequest(askText)
            : null;
        const reminder =
          !rememberMatch &&
          !whatRemember &&
          !forgetMe &&
          !enrollmentCommand &&
          !pollMatch &&
          !documentUpdateInstruction &&
          !documentTopic
            ? parseReminder(askText)
            : null;
        const groupSend =
          !rememberMatch &&
          !whatRemember &&
          !forgetMe &&
          !enrollmentCommand &&
          !pollMatch &&
          !documentUpdateInstruction &&
          !documentTopic &&
          !reminder
            ? parseGroupSend(askText)
            : null;

        if (HELP_PATTERN.test(askText)) {
          const helpText = helpTextFor(senderJid);
          await activeSock.sendMessage(remoteJid, { text: helpText });
          remember(remoteJid, "assistant", helpText);
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
        } else if (enrollmentCommand) {
          if (!isWhatsAppAdmin(senderJid)) {
            await activeSock.sendMessage(remoteJid, { text: NOT_ADMIN_TEXT });
            remember(remoteJid, "assistant", NOT_ADMIN_TEXT);
          } else {
            const adminPhoneNumber = senderJid.split("@")[0];
            // One or more round-trips to the LMS — worth a quick heads-up
            // rather than going quiet, especially for "enroll" which can
            // make several calls (find student, list courses, grant).
            await sendWorkingNotice(activeSock, remoteJid, "🔎 Checking the LMS…");
            try {
              let resultText;
              let flowStarted = false;
              if (enrollmentCommand.action === "list") {
                resultText = await handleListPendingCommand();
              } else if (enrollmentCommand.action === "find_student") {
                resultText = await handleFindStudentCommand(enrollmentCommand.query);
              } else if (enrollmentCommand.action === "course_roster") {
                resultText = await handleCourseRosterCommand(enrollmentCommand.course, enrollmentCommand.byBatch);
              } else if (enrollmentCommand.action === "enroll") {
                resultText = await handleEnrollCommand(enrollmentCommand, adminPhoneNumber);
              } else if (enrollmentCommand.action === "start_enroll") {
                resultText = await startEnrollFlow(activeSock, remoteJid, senderJid, enrollmentCommand.email, adminPhoneNumber);
                flowStarted = true;
              } else if (enrollmentCommand.action === "start_transfer") {
                resultText = await startTransferFlow(activeSock, remoteJid, senderJid, enrollmentCommand.email, adminPhoneNumber);
                flowStarted = true;
              } else {
                resultText = await handlePendingEnrollmentCommand(enrollmentCommand, adminPhoneNumber);
              }
              // startTransferFlow can send its own message directly (when it
              // skips straight to the batch menu) and returns null instead
              // of text in that case — nothing left to send here.
              if (resultText) {
                await activeSock.sendMessage(remoteJid, { text: resultText });
                remember(remoteJid, "assistant", resultText);
              }
              await db
                .collection("activity")
                .add({
                  title: `LMS action via WhatsApp: ${enrollmentCommand.action}`,
                  detail:
                    enrollmentCommand.action === "list"
                      ? "Checked pending enrollments"
                      : enrollmentCommand.action === "find_student"
                        ? `Looked up: ${enrollmentCommand.query || "(no query)"}`
                        : enrollmentCommand.action === "course_roster"
                          ? `Roster: ${enrollmentCommand.course || "(no course given)"}${enrollmentCommand.byBatch ? " (by batch)" : ""}`
                          : flowStarted
                            ? `${enrollmentCommand.action}: ${enrollmentCommand.email}`
                            : `${enrollmentCommand.student} — ${enrollmentCommand.course || enrollmentCommand.detail || ""}`.trim(),
                  type: "ok",
                  createdAt: Date.now(),
                })
                .catch(() => {});
            } catch (err) {
              console.error("LMS command failed:", err);
              const errText = `Couldn't do that — ${err.message || "something went wrong"}.`;
              await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
              remember(remoteJid, "assistant", errText);
            }
          }
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
            // Image generation genuinely takes several seconds — say so
            // up front instead of leaving the chat silent that whole time.
            await sendWorkingNotice(
              activeSock,
              remoteJid,
              referenceImage ? "🎨 Working on your poster using that reference image…" : "🎨 Working on your poster…"
            );
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
        } else if (documentUpdateInstruction) {
          try {
            const previousDoc = getLastDocument(remoteJid);
            await sendWorkingNotice(activeSock, remoteJid, "📝 Updating that document — this can take a minute…");
            const context = await getCompanyContext(senderJid);
            const result = await reviseDocumentOnTopic(previousDoc.markdown, documentUpdateInstruction, context);
            const pdfBuffer = await renderDocumentPdf(result.title, result.markdown, result.sources);
            setLastDocument(remoteJid, result);
            const sourceNote = result.sources?.length
              ? ` (${result.sources.length} source${result.sources.length === 1 ? "" : "s"})`
              : "";
            const caption = `Updated: "${result.title}"${sourceNote}.`;
            await activeSock.sendMessage(remoteJid, {
              document: pdfBuffer,
              fileName: `${slugifyFileName(result.title)}.pdf`,
              mimetype: "application/pdf",
              caption,
            });
            remember(remoteJid, "assistant", caption);
            await db
              .collection("activity")
              .add({
                title: "Revised a document on WhatsApp",
                detail: `${result.title.slice(0, 60)} — ${documentUpdateInstruction.slice(0, 60)}`,
                type: "ok",
                createdAt: Date.now(),
              })
              .catch(() => {});
          } catch (err) {
            console.error("Document revision failed:", err);
            const errText = `Couldn't update that document — ${err.message || "try again shortly"}.`;
            await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
            remember(remoteJid, "assistant", errText);
          }
        } else if (documentTopic) {
          try {
            // Research + a real PDF genuinely takes a while — say so up
            // front rather than leaving the chat silent.
            await sendWorkingNotice(
              activeSock,
              remoteJid,
              "📝 Researching that and writing it up — this can take a minute…"
            );
            const context = await getCompanyContext(senderJid);
            const result = await generateDocumentOnTopic(documentTopic, context);
            const pdfBuffer = await renderDocumentPdf(result.title, result.markdown, result.sources);
            setLastDocument(remoteJid, result);
            const sourceNote = result.sources?.length
              ? ` (${result.sources.length} source${result.sources.length === 1 ? "" : "s"})`
              : "";
            const caption = `Here's your document: "${result.title}"${sourceNote}. Ask me to update it anytime — e.g. "update the document to also include...".`;
            await activeSock.sendMessage(remoteJid, {
              document: pdfBuffer,
              fileName: `${slugifyFileName(result.title)}.pdf`,
              mimetype: "application/pdf",
              caption,
            });
            remember(remoteJid, "assistant", caption);
            await db
              .collection("activity")
              .add({
                title: "Generated a document on WhatsApp",
                detail: result.title.slice(0, 60),
                type: "ok",
                createdAt: Date.now(),
              })
              .catch(() => {});
          } catch (err) {
            console.error("Document generation failed:", err);
            const errText = `Couldn't put that document together — ${err.message || "try again shortly"}.`;
            await activeSock.sendMessage(remoteJid, { text: errText }).catch(() => {});
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

          // Reply with a voice note instead of text when: the incoming
          // message was itself a voice note (hands-free, symmetric — you
          // spoke, he speaks back), or it was explicitly asked for.
          const wantsVoice = attachment?.kind === "audio" || VOICE_REQUEST_PATTERN.test(askText);
          let sentVoice = false;
          if (wantsVoice) {
            // TTS + ffmpeg conversion take a few seconds — say so rather
            // than leaving the chat silent while that happens.
            await sendWorkingNotice(activeSock, remoteJid, "🎤 Recording a voice reply…");
            const ogg = await synthesizeVoiceReply(reply).catch((err) => {
              console.error("Voice reply failed:", err);
              return null;
            });
            if (ogg) {
              await activeSock.sendMessage(remoteJid, { audio: ogg, mimetype: "audio/ogg; codecs=opus", ptt: true });
              sentVoice = true;
            }
          }
          if (!sentVoice) {
            await sendAsMessages(activeSock, remoteJid, reply);
          }

          await db
            .collection("activity")
            .add({
              title: attachment
                ? `Read a${attachment.kind === "image" ? "n image" : attachment.kind === "document" ? " document" : " voice message"} on WhatsApp`
                : sentVoice
                  ? "Replied on WhatsApp with a voice note"
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

// --- LMS connection check requests from the dashboard ----------------------
LMS_CHECK_REQUESTS.orderBy("createdAt", "asc").onSnapshot((snap) => {
  snap.docChanges().forEach(async (change) => {
    if (change.type !== "added") return;
    const data = change.doc.data();
    if (data.processed) return;
    await change.doc.ref.update({ processed: true, processedAt: Date.now() }).catch(() => {});

    const result = await checkLmsConnection();
    await LMS_STATUS_DOC.set({ ...result, checkedAt: Date.now() }, { merge: true }).catch((err) =>
      console.error("Failed to write LMS status:", err)
    );
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
