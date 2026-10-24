// Who gets the "developer" role: full admin controls (linking/unlinking
// LEO's WhatsApp, future infra-level settings). Everyone else who signs in
// gets ordinary staff access. Kept as a plain allowlist for now rather than
// a Firestore-backed role system — simplest thing that's actually correct
// while there's a single known admin; move to a `roles` collection once
// there's more than a couple of people to manage.
const DEVELOPER_EMAILS = ["thimira.vishwa2003@gmail.com"];

export function isDeveloper(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEVELOPER_EMAILS.includes(email.toLowerCase());
}
