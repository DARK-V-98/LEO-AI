# Reminders & Scheduled Messages — Reliability Plan

**What this is:** a plan for making "remind me in 10 minutes" / "remind me
tomorrow at 9am" rock-solid — fires at the right time, every time, to the
right chat, even across a restart — plus giving admins visibility into
what's pending. This is a plan, not yet implemented beyond what's noted as
"already working" below.

## 1. What already works today

Worth stating plainly, since some of what was asked for is already true:

- **A reminder asked from a group still goes to your own inbox (DM), not
  the group.** `parseReminder()` matches the request anywhere, but
  `scheduleMessage()` is always called with `targetJid: senderJid` — the
  person's own JID — never the group's. This was already deliberate
  ("reminders are personal"), and it's the exact behavior being asked for:
  ask LEO in the group, get the reminder in your inbox.
- **Scheduling is Firestore-backed, not an in-memory timer.** `remind me`
  writes a `scheduledMessages` document (`targetJid`, `message`, `dueAt`,
  `sent: false`) immediately. A background loop (`runScheduler()`, every
  20 seconds) queries for `sent == false` documents whose `dueAt` has
  passed, sends them, and marks them `sent: true`.
- **This means a restart doesn't lose reminders.** If the bridge process
  restarts (a Railway redeploy, a crash, anything) between when a reminder
  is set and when it's due, the state survives in Firestore. When the
  process comes back up and `runScheduler()` starts polling again, any
  reminder whose `dueAt` has already passed gets caught and sent on the
  very next poll — nothing needs to "remember" it was mid-countdown,
  because nothing ever depended on the process staying alive continuously.
- **Times are parsed in Sri Lanka time, not server time.** The bridge runs
  in UTC on Railway; `chronoRef()` pins chrono-node's reference timezone to
  UTC+5:30 so "5pm" means 5pm in Colombo, not 5pm UTC. Already fixed
  earlier in this project.

## 2. Real gaps worth closing

1. **Up to 20 seconds of avoidable delay after a restart.** The scheduler
   only runs on the `setInterval` tick — if the process just restarted and
   something is already overdue (say, the whole service was down for an
   hour), it still waits for the first 20-second tick before catching up,
   instead of checking immediately on boot.
2. **No way to see or cancel what's pending.** If someone sets a reminder
   and changes their mind, or wants to check "did that actually get set,"
   there's no command for it — the only way to know is to wait and see if
   it arrives.
3. **No retry limit or failure visibility.** If `sock.sendMessage` fails
   at the exact due moment (a transient WhatsApp socket hiccup), the
   document just stays `sent: false` and gets retried forever on every
   20-second tick, silently. That's actually fine for a short blip, but
   there's no point at which anyone finds out if it's been failing for an
   hour — it just quietly never arrives, with no error surfaced anywhere a
   human would see it.
4. **No dashboard visibility.** Scheduled reminders/group-sends aren't
   shown anywhere on the Admin dashboard today — a developer has no way to
   audit what's queued up without reading Firestore directly.
5. **Deployment-level reliability isn't guaranteed outside the app.** None
   of the above protects against the bridge's *hosting* simply not
   restarting after a crash — that's a Railway service-config setting
   ("Restart Policy"), not something the code controls, and it's worth
   confirming it's actually set to restart automatically rather than
   assuming it.

## 3. Proposed fixes

### 3.1 Run the scheduler once immediately on startup

In addition to `setInterval(runScheduler, 20_000)`, call `runScheduler()`
once as soon as the socket opens (same place `startSock()`/the connection
handler already does its other first-time setup). Closes gap #1 — nothing
overdue waits an extra up-to-20-seconds after a cold start.

### 3.2 "What do I have scheduled" / cancel commands

New commands, parsed the same deliberate, regex-matched way as every other
command here (not left to the general chat model):

- `"what do I have scheduled"` / `"my reminders"` — lists the asker's own
  pending (`sent: false`, not cancelled) reminders and group-sends, with
  the due time and a short index number per entry.
- `"cancel my reminder about <text>"` / `"cancel reminder 2"` (referring to
  the list's index) — marks it `cancelled: true` (a soft flag, not a
  delete, so there's a record of it) and confirms. `runScheduler()` skips
  any document with `cancelled: true` in its query filter.

Closes gap #2.

### 3.3 Retry/failure visibility

Add an `attempts` counter to each scheduled document, incremented on every
failed send attempt. After a threshold (e.g. 5 consecutive failures across
~100 seconds of 20-second polling — effectively "still failing after a
while, not just one blip"), mark the document `failed: true` and:

- Stop retrying it (so it doesn't loop forever).
- Write an `activity` entry so it's visible on the dashboard's existing
  Overview feed.
- Optionally DM the developer's own number once, if `DAILY_DIGEST_JID` (or
  a dedicated `DEV_ALERT_JID`) is configured — same pattern already used
  for the daily digest.

Closes gap #3.

### 3.4 Dashboard: "Scheduled" panel (developer-only, read-only first pass)

A new card on the Admin tab listing `scheduledMessages` — due time, target
(whose reminder it is, or which group), the message, and status
(pending/sent/cancelled/failed). Read-only to start; cancel-from-dashboard
can follow later if it turns out to be needed, but the WhatsApp-side cancel
command (3.2) covers the actual use case already.

Closes gap #4. Lowest priority of the four — nice for auditing, not
required for reminders to actually work correctly.

### 3.5 Confirm Railway's restart policy

Not a code change: in the Railway project settings for the bridge service,
confirm **Restart Policy** is set to restart automatically on crash/failure
(not "never"). This is what actually guarantees gap #5 doesn't bite —
everything above assumes the process comes back up eventually; this is
what makes that assumption safe.

## 4. Data model changes

`scheduledMessages/{id}` gains, on top of its existing fields
(`type`, `targetJid`, `targetLabel`, `message`, `dueAt`, `createdBy`,
`sent`, `sentAt`, `createdAt`):

| New field | Type | Meaning |
| --- | --- | --- |
| `attempts` | number | Failed send attempts so far (starts at 0) |
| `failed` | boolean | Set once `attempts` crosses the retry threshold; scheduler stops retrying |
| `cancelled` | boolean | Set by the new cancel command; scheduler skips it |
| `cancelledAt` | number (ms) | When it was cancelled |

No `firestore.rules` change needed — this collection is already
bridge-written-only via the Admin SDK (not exposed to the website rules
file at all today), and the proposed dashboard panel (3.4) would be
developer-read, matching every other bridge-owned collection's pattern.

## 5. Rollout order

1. **3.1** (immediate-run on startup) — trivial, no new commands, ship
   first.
2. **3.3** (retry/failure tracking) — protects against silent failures
   going forward; also trivial, no new commands.
3. **3.2** (list/cancel commands) — the actual new user-facing feature
   from this request.
4. **3.5** — a settings check, not code; do anytime, costs nothing.
5. **3.4** (dashboard panel) — last, genuinely optional, only build if it
   turns out to be needed in practice.

## 6. What this plan deliberately does NOT change

- The core reminder/schedule flow itself (parse → Firestore write → poll
  → send) stays exactly as it is — it already does the two things this
  request asked for (DM delivery regardless of where it was asked, and
  surviving a restart). This plan only hardens the edges around it.
- No change to how `"remind me"` or `"tell group X at Y"` are phrased or
  parsed — existing commands keep working exactly as documented in
  `services/whatsapp-bridge/README.md`.
