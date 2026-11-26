// --- seed-pte-knowledge.js -----------------------------------------------
// One-off seed script for the `pteKnowledge` Firestore collection — LEO's
// PTE training knowledge base (the dashboard's "Brain" page), built from
// SmartLabs' own real training documents (reading/listening/writing/
// speaking master notes, vocabulary, scoring/student guidance), split by
// topic for tag-based retrieval (see docs/leo-pte-trainer-plan.md §3 and
// retrievePteKnowledge() in index.js).
//
// This is NOT part of the normal bridge startup. Run once, by hand:
//
//   node scripts/seed-pte-knowledge.js
//
// Needs the same FIREBASE_SERVICE_ACCOUNT env var index.js uses. Safe to
// re-run — it's additive (uses .add(), not a fixed doc id), so re-running
// creates duplicates rather than overwriting; delete the pteKnowledge
// collection first (or just add from the dashboard's Brain page instead)
// if you need to reseed from scratch.
//
// Data files: each is a plain JSON array of {topic, tags, question?,
// content, priority} objects, produced from reading SmartLabs' real
// training documents (not invented) — see pte-knowledge-data/*.json.

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error(
    "Missing FIREBASE_SERVICE_ACCOUNT env var — paste the service account JSON (as one line) before running this script."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
});
const db = admin.firestore();

const DATA_DIR = path.join(__dirname, "pte-knowledge-data");

function loadEntries() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`No ${DATA_DIR} directory found — nothing to seed.`);
    process.exit(1);
  }
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`${DATA_DIR} has no .json files — nothing to seed.`);
    process.exit(1);
  }
  const entries = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`Failed to parse ${file}: ${err.message}`);
      process.exit(1);
    }
    if (!Array.isArray(parsed)) {
      console.error(`${file} is not a JSON array — skipping.`);
      continue;
    }
    console.log(`${file}: ${parsed.length} entries`);
    entries.push(...parsed);
  }
  return entries;
}

async function main() {
  const entries = loadEntries();
  console.log(`\nSeeding ${entries.length} total pteKnowledge entries...`);

  // Firestore batches cap at 500 writes — chunk accordingly.
  const CHUNK = 450;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const batch = db.batch();
    const chunk = entries.slice(i, i + CHUNK);
    for (const entry of chunk) {
      if (!entry.topic || !entry.content) {
        console.warn("Skipping entry missing topic/content:", entry);
        continue;
      }
      const ref = db.collection("pteKnowledge").doc();
      batch.set(ref, {
        topic: entry.topic,
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        question: entry.question || null,
        content: entry.content,
        priority: Number.isFinite(entry.priority) ? entry.priority : 3,
        addedAt: Date.now(),
      });
    }
    await batch.commit();
    console.log(`Committed ${Math.min(i + CHUNK, entries.length)}/${entries.length}`);
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to seed PTE knowledge:", err);
    process.exit(1);
  });
