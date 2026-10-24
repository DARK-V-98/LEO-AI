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

It uses [Baileys](https://github.com/WhiskeySockets/Baileys), the
unofficial WhatsApp Web multi-device protocol library — no headless
browser needed, just a WebSocket connection, so it's cheap to run.

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
