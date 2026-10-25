# LEO WhatsApp Bridge

An always-on Node.js worker that keeps LEO's WhatsApp "linked device"
session alive and relays commands to/from the dashboard through Firestore.
It never exposes a public HTTP endpoint — the dashboard and this worker
only ever talk to each other via Firestore documents:

- `whatsapp/status` — this worker writes it (connection state, QR code
  when pairing); the dashboard only reads it.
- `whatsappCommands` — the dashboard writes `{type: "link"}` or
  `{type: "unlink"}` docs here; this worker watches and acts on them.
- `whatsappOutbox` — anything that wants LEO to send a WhatsApp message
  (a group digest, an alert to an admin) writes `{to, text}` here; this
  worker sends it and marks it `sent: true`.

It also listens for **incoming** WhatsApp messages and replies using the
same AI as the website's Chat tab (it calls the deployed site's
`/api/chat` route — it has no AI of its own). DMs always get a reply;
in a group, it only replies when someone actually says "Leo", the same
rule the voice wake-word uses, so he doesn't answer every message in the
company group.

It uses [Baileys](https://github.com/WhiskeySockets/Baileys), the
unofficial WhatsApp Web multi-device protocol library — no headless
browser needed, just a WebSocket connection, so it's cheap to run.

## What you can say to LEO on WhatsApp

Beyond ordinary chat, a few message patterns are recognized and acted on
directly (checked with plain keyword/date parsing — `chrono-node` for
dates, not the AI — so these are fast and don't cost an AI call):

- **Posters**: `poster: SmartLabs AI Diploma open house, blue theme`
  (or `flyer of ...`, works with "posters"/"flyers" too, and natural
  phrasing like "can you make a poster for our next intake with its
  details") — generates an image via Gemini and sends it back. Needs
  billing enabled on the Gemini key (the free tier has zero quota for
  image models) and `LEO_WEB_BASE_URL` set, since it calls the
  dashboard's `/api/generate-image` route.
  - **Reference images**: attach a photo with that caption directly
    (send the image, with "poster: ..." as its caption), or reply to
    an existing photo in the chat with "poster: ..." — either way, LEO
    downloads it and passes it to Gemini as a style/branding/layout
    reference for the new poster, verified to actually carry over
    colors, branding and layout, not just be ignored.
- **Documents**: `write a document about <topic>`, `document: <topic>`,
  `report on <topic>`, or `research <topic> and write a report` — LEO
  researches it (grounded with live Google Search when the model
  supports it, falling back to its own knowledge if that tool isn't
  accepted) and sends back a real PDF, not just a chat wall of text.
  Open to any chat/group, not admin-only — it's a general research
  tool, not an LMS action. The research call goes through the
  dashboard's `/api/document` route (needs `LEO_WEB_BASE_URL` set,
  same as posters); the Markdown that comes back is rendered into a
  PDF right here in the bridge with `pdfkit` (headings, bullets,
  paragraphs, a linked sources list when search grounding returned
  any) — no external PDF service needed. Whatever context LEO already
  has for this chat (company facts, who's asking, the real course
  catalog when LMS is configured) is included, so a document can build
  on something said earlier in the conversation, not just the bare
  topic string. The PDF itself is actually designed, not a plain text
  dump — a colored cover band with the title, accent-colored section
  headings with a rule under each, real hanging-indent bullets (a drawn
  dot, not a "• " text prefix), a slim continuation header on any page
  after the first, and a page-numbered footer, all hand-rolled with
  `pdfkit` (no external design/PDF service).
  - **Revising a document**: once LEO's sent one in a chat, `"update
    the document to also include <X>"`, `"add <X> to that document"`,
    or `"edit the document: remove <X>"` sends the current Markdown
    back to Gemini with just that instruction, asks it to apply only
    that change and return the complete updated document, then
    re-renders and re-sends the whole PDF — not a diff, a fresh file
    each time. LEO remembers the last document per chat for an hour;
    after that (or if nothing's been generated yet in that chat), an
    "update the document" message is just treated as normal
    conversation instead of being mistaken for a revision request.
- **Reminders**: `remind me in 20 minutes to call the vendor` or
  `remind me tomorrow at 9am to send the SEO report` — LEO replies
  confirming the time, then DMs you back at that time. If no time is
  understood, he'll ask for one instead of silently doing nothing.
- **Scheduled/targeted group messages**: `tell group Marketing Team: the
  meeting moved to 3pm` sends immediately; adding a time —
  `tell group Ops tomorrow at 9am: deploy window starts` — schedules it
  for then instead. LEO only matches against groups he's actually a
  member of; if the name doesn't match, he says so rather than guessing.
- **Voice messages, images, and documents** (DMs always, groups when
  addressed) — send a voice note and he transcribes + responds to what
  was said; send a photo (of a document, whiteboard, anything) and he
  reads/describes it; send a PDF (a brochure, a contract, a form) and he
  reads that too — Gemini accepts PDFs the same way as images. Works as a
  reply too: send a photo, voice note, or document with no mention at
  all, then later reply to it with "Leo, what does this say?" — he
  resolves the quoted media and answers about that, not the reply text
  alone. In a group, a bare photo/voice note/document with no "Leo"
  mention is left alone entirely — he only engages when actually
  addressed, in that message or in a reply to it. Image/audio verified
  end-to-end against the real Gemini API before shipping; PDF support
  follows the identical code path but hasn't been separately re-verified.
- **Voice replies** — send a voice note and LEO replies with one back
  (hands-free, symmetric), or say "reply with voice"/"say that as a
  voice message" anytime to get a voice note instead of text. Uses
  Gemini's TTS model, converted to OGG/Opus via a bundled `ffmpeg-static`
  binary (no system package needed on Railway) since that's the codec
  WhatsApp's voice-note bubble actually needs. The TTS call, the raw PCM
  it returns (English and Sinhala both confirmed), and this exact
  ffmpeg conversion were all verified live before shipping — the one
  thing that couldn't be verified from here is how it actually sounds
  and plays back on a real phone.
- **Leads and tasks get logged automatically** — mention a new lead
  ("just got a call from someone asking about the AI Diploma, log them,
  her number is...") or something to track ("tell the design team to
  prep the banner by Friday") in normal conversation, and Gemini's own
  tool-calling decides to log it — no exact phrasing needed, unlike the
  patterns below. Written straight to the same `leads`/`tasks` Firestore
  collections the dashboard's Overview/To-Do/Leads tabs already read, so
  it shows up there immediately, tagged with `source: "whatsapp"`.
- **Polls**: `poll: what time works for lunch? 12pm, 1pm, 2pm` sends an
  actual WhatsApp poll to the chat instead of people manually tallying
  replies (2–12 options).

- **Every message is saved** — every DM and group message either side
  sends is permanently stored in Firestore (`whatsappChats/{chatJid}/
  messages`), not just kept in memory until a restart. Each chat (a
  person's DM, or a group) has its own history; one person's DM is never
  read from or mixed into anyone else's chat — a group's history is
  naturally shared with that group already, same as WhatsApp itself.
  This is what gives LEO conversational memory ("what did I just ask")
  and lets it survive a restart/redeploy.
- **"remember that \<fact\>"** — e.g. `remember that our office closes at
  5pm on Fridays` — on top of the above, this *deliberately* promotes
  something to permanent company knowledge (`companyKnowledge`),
  included as context in *every* chat, group and DM alike, not just
  that one conversation's own history. Use this for things that should
  be common knowledge, not just "what we were just talking about".
- **Introducing yourself** — say something like "I'm Vishwa, the software
  engineer and developer of the AI and systems" and he remembers your
  name/role (stored per WhatsApp number in Firestore's `people`
  collection) and will address you by name afterwards — only ever back
  to you, never mentioned to anyone else's chat.
- **"help" / "commands" / "what can you do"** — sends back the current
  list of everything above. Deliberately a fixed, hand-written message
  (not asked of the AI) so it can never drift out of sync with what's
  actually implemented.
- **"what do you remember about me" / "forget about me"** — check or
  clear your saved name/role (the `people` record from introducing
  yourself). Doesn't touch your message history, same as nobody can
  selectively erase one WhatsApp message from a real chat — this only
  clears who LEO thinks you are.
- **Daily ops digest (opt-in, off by default)** — set `DAILY_DIGEST_JID`
  (see Variables below) and LEO sends a once-a-day morning summary of new
  leads/tasks logged through WhatsApp in the last 24h to that number.
  Stays quiet on a day with nothing new, rather than pinging "0 leads, 0
  tasks". Checked periodically, not a precise cron — "once a day" means
  the first check at/after 8am Colombo time, not exact-to-the-minute.
- **Admin-only LMS commands** — `"check enrollments"`,
  `"check student <name/email/phone>"`,
  `"approve <student> [for <course>]"`,
  `"reject <student>[: <reason>]"`, `"enroll <student> in <course>"`, and
  `"remove <student> from <course>"` call real routes on the SmartLabs LMS
  (`esystemlk/lms-smartlabs`'s `/api/leo/*` endpoints — see the "LEO ↔
  SmartLabs LMS" integration doc for the full contract), but only for
  numbers the developer has explicitly granted admin access to
  (dashboard's Admin tab → "WhatsApp admins" card). This matters once
  students have access to LEO on WhatsApp too — most numbers should only
  ever be able to chat, not make LMS decisions. A non-admin trying an
  admin command gets told plainly that they don't have access, rather
  than it silently failing or (worse) silently working. Admin access can
  only be granted/revoked from the dashboard, never from WhatsApp itself,
  so an admin's own chat being compromised can't be used to mint more
  admins. The help message ("help"/"commands") only lists admin commands
  to numbers that actually have them.
  - `"check enrollments"` lists what's actually pending — each line gives
    the student's name, email, course and batch, exactly what you'd
    quote back in an `approve`/`reject`/`remove` command. Covers both
    `status == "pending"` (bank-transfer enrollments awaiting a manual
    receipt check) and `status == "pending_payment"` (PayHere enrollments
    awaiting payment) — the LMS's query was widened to catch both.
  - `"check student <name/email/phone>"` looks up a student directly —
    asks for an identifier if you don't give one, rather than stalling.
  - `approve`/`reject`/`remove` all resolve the student+course against the
    LMS's *pending* enrollment requests, since that's the only lookup the
    LMS currently exposes by name — `remove` can only act on a still-pending
    request, not an already-active student's access (the LMS would need a
    new endpoint for that). `enroll` is different: it resolves a real
    student and course/batch directly and grants immediate access,
    skipping the pending step entirely.
  - Needs `LMS_BASE_URL` and `LMS_API_KEY` set (see Variables below) — LMS
    commands are simply disabled (the admin gets told it isn't configured
    yet) until both are set.
  - **Checking the connection**: the dashboard's Admin tab has an "LMS
    connection" card with a "Check connection" button — since only this
    worker holds `LMS_BASE_URL`/`LMS_API_KEY`, the dashboard can't test it
    directly, so clicking it writes a request to `lmsCheckRequests`, this
    worker makes a real authenticated call to the LMS (`GET
    /api/leo/courses`) and writes the result to `lms/status`, and the
    dashboard shows that live. Confirms the key and URL actually work, not
    just that they're set.
  - **Guided enroll**: `"enroll this student <email>"` starts a menu-driven
    flow instead of requiring the course/batch up front — LEO looks the
    student up, sends a numbered list of real courses, then (if more than
    one open batch exists) a numbered list of batches for the chosen
    course, then a yes/no confirmation before actually granting access.
    Reply with either a number or a few letters of the name; "cancel" at
    any step backs out. Numbered text menus were used deliberately instead
    of WhatsApp's native interactive list/button messages — those aren't
    reliably supported on unofficial Baileys-based accounts and can fail
    silently.
  - **Guided transfer**: `"change"`/`"move"`/`"transfer" <email>'s batch"`
    (the word "batch" is required) starts the same kind of guided flow,
    except the course menu is filtered to courses the student is already
    enrolled in. Confirming calls the LMS's `/api/leo/enrollments/transfer`
    route, which bans the old enrollment and grants the new batch in one
    atomic Firestore batch — never leaves a student in both or neither.
  - A guided flow in progress takes over that admin's very next reply
    (whatever it is) until they finish, cancel, or 10 minutes pass — except
    a message that's recognized as a different real command (e.g. "check
    enrollments") still interrupts it rather than getting swallowed as a
    menu choice.
  - **Course rosters**: `"list students in <course>"` (or "show"/"get",
    "enrolled in"/"registered in"/"of"/"for") returns the real roster —
    name, email, and contact for everyone actively enrolled — via the
    LMS's `/api/leo/courses/:courseId/students` route.

`companyKnowledge` starts pre-seeded (on first boot, if empty) with:
SmartLabs is an educational institute; Ms. Lahiruka is the Managing
Director and owner; Vishwa is the software engineer who built LEO,
the websites, and the other systems. Add more anytime with "remember
that ...", or edit the `companyKnowledge` collection directly in the
Firebase console.

These are checked in this order: help, "what do you remember"/"forget
me", remember, poll, poster, document, reminder, then group-send, then
falls through to a normal AI chat reply (where lead/task logging can
kick in via tool-calling) — so a message needs to clearly match one of
the keyword patterns above to trigger it instead of being handled
conversationally. Reminders and scheduled group messages are stored in
Firestore (`scheduledMessages`) and a 20-second-interval check inside
this same worker sends them once due — no separate cron job needed.

**Rapid-fire messages get combined, not confused.** If several messages
arrive in the same chat within 3 seconds of each other — someone typing
a thought across a few lines, or "remind me" / "in 10 minutes" / "to
call the vendor" sent as three separate messages — they're joined into
one combined turn before any of the matching above runs, instead of each
one being treated as a separate, disconnected message. Context sent to
the AI covers the last 20 messages in that chat (not just the current
one), so follow-up questions and multi-part requests hold together.

**LEO can send more than one message when he's working**, same as a
person continuing a conversation rather than making you wait for one
big final block:
- A reply with a blank line between two distinct thoughts (the system
  prompt tells the model this) gets sent as separate WhatsApp messages,
  a short beat apart, instead of one wall of text — capped at 4 so it
  never floods a chat.
- Before something that genuinely takes a few seconds — generating a
  poster, researching and writing a document, synthesizing a voice
  reply, or an LMS admin command that makes one or more real network
  calls — he sends a quick "working on it" message first, so the chat
  doesn't just go silent while that happens.

**Viewing chats on the dashboard**: every DM and group chat is visible
on the website's Admin tab (`whatsappChats` in Firestore) — restricted
to the developer role only (see `firestore.rules`), since this is real
people's conversations, not general company data.

## 1. Get a Firebase service account key

This is different from the public web config already used by the
dashboard — it's a private admin credential.

1. Firebase console → your project (`leo-ai-101`) → ⚙️ **Project settings**
   → **Service accounts** tab.
2. Click **Generate new private key**. It downloads a `.json` file.
3. Open that file — you'll paste its *entire contents* as one Railway env
   var in step 3 below. Keep it secret; anyone with it has full admin
   access to your Firestore data.

## 2. Push this folder to its own place Railway can deploy from

Railway deploys from a GitHub repo + a root directory, so you don't need a
separate repo — just point it at this folder inside `LEO-AI`.

## 3. Create the Railway service

1. [railway.app](https://railway.app) → **New Project** → **Deploy from
   GitHub repo** → pick `DARK-V-98/LEO-AI`.
2. After it creates the service, open its **Settings** tab:
   - **Root Directory**: `services/whatsapp-bridge`
   - **Start Command**: `npm start` (should auto-detect from
     `package.json`, but set it explicitly if not)
3. Open the **Variables** tab and add:
   - `FIREBASE_SERVICE_ACCOUNT` — paste the *entire* JSON file from step 1
     as one value (Railway handles multi-line/long values fine).
   - `LEO_WEB_BASE_URL` — the dashboard's URL, e.g.
     `https://leo-ai-leo-ui.vercel.app` (no trailing slash). Without
     this, LEO can't reply to incoming WhatsApp messages — he'll just
     stay silent.
   - `AUTH_DIR` — leave unset to use the default (`./auth_info`), or set
     it if you're mounting a volume somewhere specific (see step 4).
   - `DAILY_DIGEST_JID` — optional. A WhatsApp JID (e.g.
     `94771234567@s.whatsapp.net`) to send the once-a-day leads/tasks
     digest to. Leave unset to skip the digest entirely.
   - `REMINDER_TZ_OFFSET_MINUTES` — optional, defaults to `330` (Sri
     Lanka, UTC+5:30). Only change this if the team isn't in that
     timezone.
   - `GEMINI_DAILY_CALL_BUDGET` — optional, defaults to `1500`. A
     soft daily cap on Gemini calls (set on the website project, not
     here) — see the website's own env docs.
   - `LMS_BASE_URL` — optional. The SmartLabs LMS's deployed URL (e.g.
     `https://lms.smartlabs.lk`), no trailing slash. Needed for the
     admin-only `approve`/`reject`/`enroll`/`remove` commands.
   - `LMS_API_KEY` — optional, goes with `LMS_BASE_URL`. The shared
     secret the LMS's own `LEO_API_KEY` env var was set to — ask whoever
     set up the LMS side for the exact value. Treat it like
     `FIREBASE_SERVICE_ACCOUNT`: a credential, never committed to git.
4. Deploy. Check the **Deployments → Logs** tab — you should see:
   ```
   LEO WhatsApp bridge is up. Waiting for a link request from the dashboard…
   ```

## 4. Add a persistent volume (important)

Without this, every redeploy wipes the WhatsApp session and you'll have to
re-scan the QR code each time.

1. On the service → **Settings** → **Volumes** → **New Volume**.
2. Mount path: `/app/auth_info` (matches the default `AUTH_DIR`).
3. Redeploy once after adding it.

## 5. Link LEO's WhatsApp

1. Open the LEO dashboard, sign in with the developer account
   (`thimira.vishwa2003@gmail.com`), go to the **Admin** tab.
2. Click **Request link**. Within a few seconds a QR code should appear
   (the worker picked up the command from `whatsappCommands` and started
   the connection).
3. On the phone that should *be* LEO's WhatsApp: **WhatsApp → Settings →
   Linked Devices → Link a Device**, and scan the code.
4. The Admin tab should flip to **Connected** once pairing finishes.
5. From that phone (or any existing member), add LEO's number to the
   company WhatsApp group — he can only post to groups he's a member of.

## 6. Unlinking

Click **Unlink** in the Admin tab, or manually log the device out from
WhatsApp's own **Linked Devices** screen on the phone (the worker will
notice the disconnect and update its status either way).

## What I couldn't verify myself

I wrote this against Baileys' documented, stable API, but I have no way to
actually run a persistent process or scan a QR code with a phone from
where I'm working — so this is built carefully but **not live-tested
end-to-end**. The first real link attempt is the real test. If something
doesn't behave as described above, check the Railway logs first — they'll
show the actual error from Baileys/Firestore.

## A note on account risk

This uses WhatsApp's unofficial linked-device protocol, not Meta's
sanctioned Business API. It's a widely-used, generally reliable pattern
for exactly this kind of internal automation (one group, a few admin
DMs), but WhatsApp's terms don't technically permit automated accounts,
and unusually high-volume or spam-like behavior can get a number flagged.
Keep usage to genuine, moderate internal messaging and this should be a
non-issue.
