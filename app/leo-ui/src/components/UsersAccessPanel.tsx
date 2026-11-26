"use client";

import DashboardAdminsPanel from "./DashboardAdminsPanel";
import WhatsAppAdminsPanel from "./WhatsAppAdminsPanel";

/** Who can get into what — dashboard sign-in and WhatsApp admin commands,
 * each its own real, developer-managed Firestore-backed allowlist. */
export default function UsersAccessPanel() {
  return (
    <div className="flex flex-col gap-5">
      <DashboardAdminsPanel />
      <WhatsAppAdminsPanel />
    </div>
  );
}
