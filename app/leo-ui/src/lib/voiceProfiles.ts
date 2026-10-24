"use client";

import { db, firebaseEnabled } from "./firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";

export type VoiceProfile = {
  id: string;
  name: string;
  /** Rough voiceprint: [averagePitchHz, spectralCentroid] — a lightweight
   * local heuristic, not a production speaker-recognition embedding. */
  signature: [number, number];
  samples: number;
  lastHeard: number;
};

const LOCAL_KEY = "leo.voiceProfiles";
const COLLECTION = "voiceProfiles";

function readLocal(): VoiceProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as VoiceProfile[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(profiles: VoiceProfile[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(profiles));
  } catch {
    /* storage unavailable — profile just won't persist this session */
  }
}

/** Subscribes to the list of known voice profiles. Returns an unsubscribe fn. */
export function subscribeVoiceProfiles(
  cb: (profiles: VoiceProfile[]) => void
): () => void {
  if (firebaseEnabled && db) {
    return onSnapshot(collection(db, COLLECTION), (snap) => {
      const profiles = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VoiceProfile, "id">),
      }));
      cb(profiles);
    });
  }

  // Local fallback: emit immediately, then on storage events (other tabs).
  cb(readLocal());
  const handler = () => cb(readLocal());
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export async function enrollVoiceProfile(
  name: string,
  signature: [number, number]
): Promise<string> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;

  if (firebaseEnabled && db) {
    await setDoc(doc(db, COLLECTION, id), {
      name,
      signature,
      samples: 1,
      lastHeard: Date.now(),
      createdAt: serverTimestamp(),
    });
    return id;
  }

  const profiles = readLocal();
  profiles.push({ id, name, signature, samples: 1, lastHeard: Date.now() });
  writeLocal(profiles);
  return id;
}

export async function touchVoiceProfile(
  id: string,
  refinedSignature?: [number, number]
) {
  if (firebaseEnabled && db) {
    await updateDoc(doc(db, COLLECTION, id), {
      lastHeard: Date.now(),
      samples: increment(1),
      ...(refinedSignature ? { signature: refinedSignature } : {}),
    });
    return;
  }

  const profiles = readLocal();
  const next = profiles.map((p) =>
    p.id === id
      ? {
          ...p,
          lastHeard: Date.now(),
          samples: p.samples + 1,
          signature: refinedSignature ?? p.signature,
        }
      : p
  );
  writeLocal(next);
}

/** Nearest-neighbour match against known voiceprints within a tolerance. */
export function matchVoiceProfile(
  signature: [number, number],
  profiles: VoiceProfile[],
  toleranceHz = 28
): VoiceProfile | null {
  let best: VoiceProfile | null = null;
  let bestDist = Infinity;
  for (const p of profiles) {
    const dist = Math.hypot(
      signature[0] - p.signature[0],
      (signature[1] - p.signature[1]) / 4
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best && bestDist <= toleranceHz ? best : null;
}
