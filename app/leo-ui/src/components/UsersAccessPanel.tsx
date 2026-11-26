"use client";

import DashboardAdminsPanel from "./DashboardAdminsPanel";
import WhatsAppAdminsPanel from "./WhatsAppAdminsPanel";
import StudentsPanel from "./StudentsPanel";

/** Who can get into what — dashboard sign-in, WhatsApp admin commands, and
 * which students LEO (as trainer) actually talks to — each its own real,
 * developer-managed Firestore-backed allowlist. */
export default function UsersAccessPanel() {
  return (
    <div className="flex flex-col gap-5">
      <DashboardAdminsPanel />
      <WhatsAppAdminsPanel />
      <StudentsPanel />
    </div>
  );
}
