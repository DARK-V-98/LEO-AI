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
- **Reminders**: `remind me in 20 minutes to call the vendor` or
  `remind me tomorrow at 9am to send the SEO report` — LEO replies
  confirming the time, then DMs you back at that time. If no time is
  understood, he'll ask for one instead of silently doing nothing.
- **Scheduled/targeted group messages**: `tell group Marketing Team: the
  meeting moved to 3pm` sends immediately; adding a time —
  `tell group Ops tomorrow at 9am: deploy window starts` — schedules it
  for then instead. LEO only matches against groups he's actually a
  member of; if the name doesn't match, he says so rather than guessing.
- **Voice messages and images** (DMs always, groups when addressed) — send
  a voice note and he transcribes + responds to what was said; send a
  photo (of a document, whiteboard, anything) and he reads/describes it.
  Works as a reply too: send a photo or voice note with no mention at
  all, then later reply to it with "Leo, what does this say?" — he
  resolves the quoted media and answers about that, not the reply text
  alone. In a group, a bare photo/voice note with no "Leo" mention is
  left alone entirely — he only engages when actually addressed, in that
  message or in a reply to it. Verified end-to-end against the real
  Gemini API for both image and audio input before shipping.

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

`companyKnowledge` starts pre-seeded (on first boot, if empty) with:
SmartLabs is an educational institute; Ms. Lahiruka is the Managing
Director and owner; Vishwa is the software engineer who built LEO,
the websites, and the other systems. Add more anytime with "remember
that ...", or edit the `companyKnowledge` collection directly in the
Firebase console.

These are checked in this order: help, remember, poster, reminder, then
group-send, then falls through to a normal AI chat reply — so a message
needs to clearly match one of the patterns above to trigger it instead of
just being answered conversationally. Reminders and scheduled group
messages are stored in Firestore (`scheduledMessages`) and a
20-second-interval check inside this same worker sends them once due —
no separate cron job needed.

**Rapid-fire messages get combined, not confused.** If several messages
arrive in the same chat within 3 seconds of each other — someone typing
a thought across a few lines, or "remind me" / "in 10 minutes" / "to
call the vendor" sent as three separate messages — they're joined into
one combined turn before any of the matching above runs, instead of each
one being treated as a separate, disconnected message. Context sent to
the AI covers the last 20 messages in that chat (not just the current
one), so follow-up questions and multi-part requests hold together.

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
