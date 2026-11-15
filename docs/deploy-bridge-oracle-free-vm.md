# Moving the WhatsApp bridge off Railway to a free Oracle Cloud VM

**Why this instead of Railway/Fly/Render:** the bridge needs a real,
always-on process (a persistent WhatsApp socket + local auth-credential
files) — not something a serverless/sleep-when-idle free tier can do.
Oracle Cloud's "Always Free" tier gives a genuine, non-expiring free VM
(up to 4 ARM CPUs / 24GB RAM on the Ampere A1 shape) that stays running
24/7 forever, at the cost of you managing the server yourself instead of
a git-push-to-deploy platform like Railway.

This is a guide to follow yourself (account creation, SSH, server
commands) — I can't do any of this for you since it's your cloud account
and a machine I have no access to. Tell me what you see at any step if
something doesn't match and I'll adjust.

## 1. Create the Oracle Cloud account

1. Go to oracle.com/cloud/free and sign up. You'll need a card for identity
   verification, but the Always Free resources genuinely never bill you —
   Oracle keeps them separate from anything paid.
2. Pick a home region when asked. **This matters** — Always Free Ampere
   (ARM) capacity is sometimes unavailable in busy regions; if you hit a
   capacity error in step 2 below, this is the first thing to reconsider
   (pick a less busy region, or fall back to the smaller AMD shape
   mentioned there).

## 2. Create the VM instance

In the Oracle Cloud console: **Compute → Instances → Create instance**.

- **Name**: anything, e.g. `leo-whatsapp-bridge`.
- **Image**: Ubuntu, latest LTS (22.04 or 24.04).
- **Shape**: click "Change shape" → Ampere → **VM.Standard.A1.Flex** →
  set 2 OCPUs / 12GB RAM (comfortably within the Always Free allowance of
  4 OCPU/24GB total, leaves headroom to run a second thing later if you
  ever want). If you get an "out of capacity" error creating this shape,
  that's a known, common Always-Free-tier issue — try a different
  availability domain in the same region (there are usually 1-3), or as a
  last resort fall back to the **VM.Standard.E2.1.Micro** shape (smaller,
  but also Always Free and has no capacity issues).
- **Networking**: leave the default VCN/subnet, and make sure "Assign a
  public IPv4 address" is checked — you need this to SSH in.
- **SSH keys**: let it generate a key pair for you and **download the
  private key immediately** (you can't get it again after this screen) —
  or paste your own public key if you already have one.
- Click **Create**. Wait a few minutes for it to reach "Running".

Once running, copy its **public IP address** from the instance details
page — you'll need it for every step below.

## 3. Confirm SSH access is open

Oracle's default security list usually already allows inbound SSH (port
22) from anywhere. Double check: **Networking → Virtual Cloud Networks →
(your VCN) → Security Lists → Default Security List → Ingress Rules** —
there should be a rule for `0.0.0.0/0`, TCP, destination port 22. If not,
add one.

No other inbound port is needed — the bridge only makes *outbound*
connections (to WhatsApp, to Firestore, to the website), so nothing else
needs opening.

## 4. SSH in and install Node.js

From your own machine:

```bash
chmod 600 /path/to/the-private-key.pem   # if you downloaded one
ssh -i /path/to/the-private-key.pem ubuntu@<VM_PUBLIC_IP>
```

Once in, install Node.js 20 (matches this project's `engines` field) and
git:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v   # should print v20.x
```

## 5. Get the bridge code onto the VM

```bash
git clone https://github.com/DARK-V-98/LEO-AI.git
cd LEO-AI/services/whatsapp-bridge
npm install
```

## 6. Set the environment variables

Create an env file the service will read from:

```bash
nano /home/ubuntu/LEO-AI/services/whatsapp-bridge/.env
```

Paste in (same values as whatever's set on Railway today — copy them
from the Railway dashboard's Variables tab):

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
LEO_WEB_BASE_URL=https://your-dashboard-domain.vercel.app
LMS_BASE_URL=https://your-lms-domain
LMS_API_KEY=the-shared-secret
GEMINI_DAILY_CALL_BUDGET=1500
DAILY_DIGEST_JID=94xxxxxxxxx@s.whatsapp.net
```

(Only include the ones you actually use — `LMS_BASE_URL`/`LMS_API_KEY`
and `DAILY_DIGEST_JID` are optional. `FIREBASE_SERVICE_ACCOUNT` must stay
as one single-line JSON string, exactly like on Railway.)

Save with `Ctrl+O`, `Enter`, then `Ctrl+X`.

## 7. Keep it alive with systemd (this is your "auto start")

This is the actual equivalent of Railway's "always restart the service" —
systemd will start the bridge on boot and restart it immediately if it
ever crashes.

```bash
sudo nano /etc/systemd/system/leo-bridge.service
```

Paste in:

```ini
[Unit]
Description=LEO WhatsApp bridge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/LEO-AI/services/whatsapp-bridge
EnvironmentFile=/home/ubuntu/LEO-AI/services/whatsapp-bridge/.env
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable leo-bridge   # starts automatically on every boot
sudo systemctl start leo-bridge
sudo systemctl status leo-bridge   # should show "active (running)"
```

Watch its logs (equivalent to Railway's log tab):

```bash
sudo journalctl -u leo-bridge -f
```

## 8. Linking WhatsApp on the new machine

This is a **new server**, so it doesn't have the WhatsApp login session
that lived on Railway's disk. You have two options:

- **Easiest — just relink**: watch the logs (step 7's `journalctl`
  command) and use the dashboard's existing "link WhatsApp" flow the same
  way you did originally on Railway — it'll generate a fresh QR code to
  scan. This logs the old Railway session out once the new one links (a
  WhatsApp number only has one active "linked device" session for this
  app at a time).
- **Carry the existing session over** (skip re-scanning): copy the
  `auth_info` folder from the Railway service to this VM before starting
  it the first time — Railway's dashboard has a way to open a shell/download
  files from the running service; copy that folder to
  `/home/ubuntu/LEO-AI/services/whatsapp-bridge/auth_info` on the VM
  *before* running `systemctl start` the first time. More fiddly, skip
  this unless staying logged in without rescanning actually matters to you.

## 9. Updating the code later

No git-push-to-deploy here — when you push new commits, update the VM
yourself:

```bash
ssh -i /path/to/the-private-key.pem ubuntu@<VM_PUBLIC_IP>
cd LEO-AI/services/whatsapp-bridge
git pull
npm install        # only needed if package.json changed
sudo systemctl restart leo-bridge
```

Worth turning into a one-line script on the VM once you're tired of
typing it:

```bash
cat > ~/redeploy.sh <<'EOF'
#!/bin/bash
cd ~/LEO-AI/services/whatsapp-bridge
git pull
npm install
sudo systemctl restart leo-bridge
EOF
chmod +x ~/redeploy.sh
```

Then just `~/redeploy.sh` after each push.

## 10. Decommissioning Railway (once this is confirmed working)

Don't delete the Railway service until you've confirmed WhatsApp
messages are actually flowing through the new VM — keep both around
briefly, link the new one last (linking logs the old one out
automatically), confirm a test message works, *then* delete/pause the
Railway service so you're not paying for both.

## Notes specific to this project

- This directly closes the open item from
  `docs/reminders-scheduling-plan.md` §3.5/§8 — `Restart=always` in the
  systemd unit above *is* "confirm the restart policy is set to
  auto-restart," just on this host instead of Railway's dashboard
  setting.
- `ffmpeg-static` (used for voice-reply conversion) ships prebuilt
  binaries for `linux-arm64`, so it works fine on the Ampere A1 shape —
  no extra setup needed there.
- Nothing about the website (`app/leo-ui`, on Vercel) or the dashboard
  needs to change — `LEO_WEB_BASE_URL` on the VM just needs to keep
  pointing at wherever the website actually is, same as it did on
  Railway.
