// --- seed-scoring-rubrics.js --------------------------------------------
// One-off seed script for the `scoringRubrics` Firestore collection used by
// LEO's essay-scoring feature.
//
// What it does: writes a single rubric document — the real PTE Academic
// "Write Essay" rubric, ported from SmartLabs' own production site
// (github.com/DARK-V-98/smartlabs, src/ai/flows/pte-writing.types.ts) — to
// `scoringRubrics/pte-write-essay`. It uses `set(..., { merge: true })`,
// so running it again is safe and will not clobber other fields added to
// that document later.
//
// This is NOT part of the normal bridge startup (index.js). It is meant to
// be run once, by hand, from a developer's machine or a one-off Railway
// shell, e.g.:
//
//   node scripts/seed-scoring-rubrics.js
//
// It needs the same FIREBASE_SERVICE_ACCOUNT env var that index.js uses
// (the full service account JSON, as a single-line string).

import admin from "firebase-admin";

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

const PTE_WRITE_ESSAY_RUBRIC = {
  id: "pte-write-essay",
  name: "PTE Academic Writing — Write Essay",
  maxScore: 13,
  criteria: [
    { key: "content", label: "Content", max: 3 },
    { key: "form", label: "Form (200-300 words)", max: 2 },
    { key: "structure", label: "Development, Structure & Coherence", max: 2 },
    { key: "grammar", label: "Grammar", max: 2 },
    { key: "vocabulary", label: "Vocabulary", max: 2 },
    { key: "spelling", label: "Spelling", max: 2 },
  ],
};

async function main() {
  const docRef = db.collection("scoringRubrics").doc(PTE_WRITE_ESSAY_RUBRIC.id);
  await docRef.set(PTE_WRITE_ESSAY_RUBRIC, { merge: true });
  console.log(
    `Seeded rubric at scoringRubrics/${PTE_WRITE_ESSAY_RUBRIC.id}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to seed scoring rubrics:", err);
    process.exit(1);
  });
