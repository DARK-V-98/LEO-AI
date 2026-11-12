// --- seed-scoring-rubrics.js --------------------------------------------
// One-off seed script for the `scoringRubrics` Firestore collection used by
// LEO's essay/speaking-scoring feature.
//
// What it does: writes one document per rubric — all ported from
// SmartLabs' own production site (github.com/DARK-V-98/smartlabs,
// src/ai/flows/pte-writing.types.ts and pte-speaking.types.ts), not
// invented — to `scoringRubrics/<id>`. Uses `set(..., { merge: true })`,
// so running it again is safe and won't clobber other fields added later.
//
// Note: the actual scoring prompts/schemas (in app/leo-ui/src/lib/
// llmRouter.ts) are hardcoded per task rather than read from these
// documents at request time — these exist as the documented source of
// truth and for a future dashboard view, same reasoning as the Write
// Essay rubric before this. Swapping a rubric's numbers here doesn't
// change scoring behavior yet; that would need llmRouter.ts to read from
// Firestore instead, which is a deliberate later step, not done here.
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

// Writing tasks — summed (not averaged) scores, field names use the
// "...Score" suffix to match the real site's convention.
const WRITING_RUBRICS = [
  {
    id: "pte-write-essay",
    name: "PTE Academic Writing — Write Essay",
    maxScore: 13,
    criteria: [
      { key: "contentScore", label: "Content", max: 3 },
      { key: "formScore", label: "Form (200-300 words)", max: 2 },
      { key: "structureScore", label: "Development, Structure & Coherence", max: 2 },
      { key: "grammarScore", label: "Grammar", max: 2 },
      { key: "vocabularyScore", label: "Vocabulary", max: 2 },
      { key: "spellingScore", label: "Spelling", max: 2 },
    ],
  },
  {
    id: "pte-summarize-written-text",
    name: "PTE Academic Writing — Summarize Written Text",
    maxScore: 7,
    criteria: [
      { key: "contentScore", label: "Content (covering the main points)", max: 2 },
      { key: "formScore", label: "Form (a single sentence, 5-75 words)", max: 1 },
      { key: "grammarScore", label: "Grammar", max: 2 },
      { key: "vocabularyScore", label: "Vocabulary", max: 2 },
    ],
  },
];

// Speaking tasks — all scored the same shape: content (or isCorrect for
// Answer Short Question) + pronunciation + fluency, each 0-90, averaged
// (not summed) for the overall score.
const SPEAKING_RUBRICS = [
  { id: "pte-speaking-read-aloud", name: "PTE Speaking — Read Aloud" },
  { id: "pte-speaking-repeat-sentence", name: "PTE Speaking — Repeat Sentence" },
  { id: "pte-speaking-describe-image", name: "PTE Speaking — Describe Image" },
  { id: "pte-speaking-retell-lecture", name: "PTE Speaking — Retell Lecture" },
  { id: "pte-speaking-answer-short-question", name: "PTE Speaking — Answer Short Question" },
  { id: "pte-speaking-respond-to-situation", name: "PTE Speaking — Respond to a Situation" },
  { id: "pte-speaking-summarize-group-discussion", name: "PTE Speaking — Summarize Group Discussion" },
].map((r) => ({
  ...r,
  maxScore: 90,
  scoring: "average",
  criteria:
    r.id === "pte-speaking-answer-short-question"
      ? [
          { key: "isCorrect", label: "Correct answer (90 if correct, 10 if not)", max: 90 },
          { key: "pronunciationScore", label: "Pronunciation", max: 90 },
          { key: "fluencyScore", label: "Fluency", max: 90 },
        ]
      : [
          { key: "contentScore", label: "Content", max: 90 },
          { key: "pronunciationScore", label: "Pronunciation", max: 90 },
          { key: "fluencyScore", label: "Fluency", max: 90 },
        ],
}));

const ALL_RUBRICS = [...WRITING_RUBRICS, ...SPEAKING_RUBRICS];

async function main() {
  const batch = db.batch();
  for (const rubric of ALL_RUBRICS) {
    batch.set(db.collection("scoringRubrics").doc(rubric.id), rubric, { merge: true });
  }
  await batch.commit();
  console.log(`Seeded ${ALL_RUBRICS.length} rubrics: ${ALL_RUBRICS.map((r) => r.id).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to seed scoring rubrics:", err);
    process.exit(1);
  });
