"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, addDoc, serverTimestamp } from "firebase/firestore";

/** Course batch/intake dates — plain company info shown on the Brain
 * page's "Course dates" section, developer-managed from the dashboard. */
export type CourseDate = {
  id: string;
  courseName: string;
  startDate: string; // free-text, e.g. "2026-12-01" or "1st Dec batch"
  note?: string;
  addedAt?: number;
};

const COLLECTION = "courseDates";

export function subscribeCourseDates(cb: (dates: CourseDate[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("addedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CourseDate, "id">) })));
    },
    () => cb([])
  );
}

export async function addCourseDate(courseName: string, startDate: string, note?: string) {
  if (!firebaseEnabled || !db) return;
  await addDoc(collection(db, COLLECTION), {
    courseName: courseName.trim(),
    startDate: startDate.trim(),
    note: note?.trim() || null,
    addedAt: serverTimestamp(),
  });
}

export async function removeCourseDate(id: string) {
  if (!firebaseEnabled || !db) return;
  await deleteDoc(doc(db, COLLECTION, id));
}
