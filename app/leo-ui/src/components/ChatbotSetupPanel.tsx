"use client";

import ClassGroupsPanel from "./ClassGroupsPanel";

/** Configuration that changes how LEO behaves in specific chats — right
 * now, which WhatsApp groups get essay/speaking scoring treated as a
 * class. Real, developer-managed Firestore data, same as everywhere else. */
export default function ChatbotSetupPanel() {
  return (
    <div className="flex flex-col gap-5">
      <ClassGroupsPanel />
    </div>
  );
}
