"use client";

import { db, firebaseEnabled } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

/**
 * Real (bridge-written) daily analytics — one dailyStats/{YYYY-MM-DD} doc
 * per Sri-Lanka-local day, updated by services/whatsapp-bridge/index.js
 * (recordMessageStat / recordResponseTimeStat) via atomic increments.
 * Nothing here is estimated or backfilled: a day with no activity simply
 * has no doc, and the dashboard treats that as zero.
 */

// Matches LOCAL_TZ_OFFSET_MINUTES's default in the bridge
// (REMINDER_TZ_OFFSET_MINUTES, UTC+5:30) — kept in sync by hand since the
// two run in different processes/languages.
const LOCAL_TZ_OFFSET_MINUTES = 330;

export type DailyStat = {
  date: string; // YYYY-MM-DD, Sri Lanka local day
  messageCount: number;
  responseTimeMsSum: number;
  responseTimeMsCount: number;
};

/** Today's date key, in the same local day the bridge writes dailyStats
 * docs under — use this to look up "today"'s entry in a subscribed list. */
export function todayStatsKey(): string {
  const shifted = new Date(Date.now() + LOCAL_TZ_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** N day keys ending today, oldest first — for building a fixed-width
 * chart x-axis even on days with no dailyStats doc (shown as zero). */
export function lastNDayKeys(days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const shifted = new Date(Date.now() + LOCAL_TZ_OFFSET_MINUTES * 60_000 - i * 86_400_000);
    keys.push(shifted.toISOString().slice(0, 10));
  }
  return keys;
}

export function subscribeDailyStats(cb: (stats: DailyStat[]) => void): () => void {
  if (!firebaseEnabled || !db) {
    cb([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "dailyStats"),
    (snap) => {
      const stats: DailyStat[] = snap.docs.map((d) => {
        const data = d.data() as {
          messageCount?: number;
          responseTimeMsSum?: number;
          responseTimeMsCount?: number;
        };
        return {
          date: d.id,
          messageCount: data.messageCount ?? 0,
          responseTimeMsSum: data.responseTimeMsSum ?? 0,
          responseTimeMsCount: data.responseTimeMsCount ?? 0,
        };
      });
      stats.sort((a, b) => a.date.localeCompare(b.date));
      cb(stats);
    },
    () => cb([])
  );
}
