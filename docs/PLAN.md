# LEO AI / "NeuraLink" — SmartLabs Company Assistant
## Master Architecture & Delivery Plan

This document is the single source of truth for what we're building, how it's structured,
and in what order. Everything the user asked for is mapped to a concrete component below.

---

## 1. What this system actually is

A always-on company operations agent ("NeuraLink") that:

1. Wakes up automatically every ~30 minutes, with no human needed to trigger it.
2. Checks all of SmartLabs' platforms (website, LMS, Facebook/Meta Ads, social, email, etc.)
3. Sends WhatsApp messages to the team about upcoming events, scheduled posts, deadlines,
   and anything flagged important.
4. Supports multiple staff users logging in at the same time, each with their own chat/voice
   session and their own permission scope.
5. Has a dashboard ("NeuraLink Dashboard") where users can see tasks, leads, ad performance,
   SEO issues, and talk to the AI by voice or text.
6. Can take real actions on our behalf (browser automation, LMS admin actions, ad changes) —
   but only after an explicit human confirmation (voice "yes" or a click) per action, logged.
7. Uses multiple LLMs (Gemini free tier, OpenRouter free-tier models, etc.) with automatic
   fallback/routing instead of depending on one paid provider.

Internally this is 6 cooperating services, not one monolith. That's what makes "no blockages"
possible — if one connector (say, the LMS) goes down, the scheduler, WhatsApp alerts, and
dashboard keep working.

---

## 2. System architecture

```
                         ┌─────────────────────────┐
                         │   NeuraLink Dashboard    │  (Next.js web app)
                         │  - multi-user login      │
                         │  - live chat + voice UI  │
                         │  - task/lead/SEO views   │
                         └────────────┬─────────────┘
                                      │ WebSocket + REST
                         ┌────────────┴─────────────┐
                         │      Core API / Gateway   │  (Node.js/TS, Fastify)
                         │  - auth (multi-user)      │
                         │  - session + permissions  │
                         │  - action-confirmation    │
                         │    gate (the "Mother May  │
                         │    I" layer)              │
                         └──┬───────┬───────┬────────┘
             ┌──────────────┘       │       └───────────────┐
┌────────────┴───────────┐ ┌────────┴─────────┐ ┌────────────┴────────────┐
│   LLM Router Service   │ │ Scheduler Worker  │ │  Automation Executor    │
│ - Gemini (free tier)   │ │ (cron, every 30m) │ │ - Playwright browser    │
│ - OpenRouter free      │ │ - polls connectors │ │ - desktop control layer │
│   models (fallback     │ │ - diff/new-event   │ │ - "ask permission"      │
│   chain)                │ │   detection        │ │   voice/click prompt    │
│ - cost/rate-limit aware│ │ - triggers alerts  │ │ - per-action audit log  │
└─────────────────────────┘ └─────────┬──────────┘ └────────────┬────────────┘
                                       │                         │
                         ┌─────────────┴─────────────────────────┴───────────┐
                         │                Connector Layer                     │
                         │  (one adapter per platform, isolated & swappable)  │
                         ├────────────┬────────────┬────────────┬────────────┤
                         │  Website / │  Facebook/ │   LMS       │  WhatsApp  │
                         │  SEO crawl │  Meta Ads  │  (student   │  (Business │
                         │            │  API       │  enrolment) │  API)      │
                         └────────────┴────────────┴────────────┴────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │   Postgres + Vector store   │
                         │ (tasks, leads, logs, memory)│
                         └──────────────────────────────┘
```

---

## 3. Component-by-component plan

### 3.1 Scheduler Worker — "the 30-minute heartbeat"
- A cron-based worker (node-cron or a lightweight queue like BullMQ + Redis) fires every 30 min,
  independent of whether anyone is logged in or the dashboard is open.
- Each tick runs a pipeline: `fetch → diff against last-known state → classify importance → notify`.
- State is stored per-connector in Postgres, so we only alert on *new or changed* things, not
  everything every time (no spam).
- If a connector fails (site down, API token expired), the worker logs it and still completes
  the other checks — one broken integration never blocks the rest.

### 3.2 Connector Layer (one per platform)
Each connector is a small, independent adapter with a common interface
`{ check(), getUpcomingEvents(), getNewLeads(), ... }` so new platforms can be added without
touching the core:

- **Website connector** — crawls our site, pulls scheduled/draft posts (CMS API if we have one,
  e.g. WordPress REST API), checks publish calendar.
- **SEO connector** — runs technical SEO checks (title/meta tags, broken links, page speed via
  Lighthouse/PageSpeed API, missing alt text, sitemap/robots.txt, duplicate content, mobile
  usability) and produces a prioritized fix list, refreshed each run or daily.
- **Facebook/Meta Ads connector** — uses the Meta Marketing API to pull: active campaigns,
  spend, CTR/CPA trends, new leads from Lead Ads forms, and generates suggestions (e.g.
  "Campaign X CPA up 40% in 24h — suggest pausing or changing creative").
- **LMS connector** — platform-specific (tell me which LMS: Moodle, custom, LearnWorlds, etc.)
  admin API or automation layer to list pending student signups, and (with confirmation) accept
  them.
- **Calendar/events connector** — pulls from Google Calendar / internal scheduling so "upcoming
  events" alerts are accurate.

### 3.3 WhatsApp Notification Service
- Uses the official WhatsApp Business Platform API (via Meta Cloud API, or Twilio as a managed
  wrapper — recommend Meta Cloud API directly since we're already in the Meta ecosystem for ads).
- Message templates for: upcoming events, scheduled posts due, new leads, SEO issues found,
  ad performance alerts, LMS pending actions.
- Routes to the right staff member(s) based on role (e.g. ads alerts → marketing lead, LMS
  alerts → academic admin) plus a general company group for daily summary.
- Daily digest message + instant alerts for urgent items (time-sensitive events, big ad spend
  anomalies).

### 3.4 Multi-LLM Router
- Abstraction layer so every part of the system calls one internal `generate()` function instead
  of a specific provider.
- Provider chain example: Gemini (free tier) → OpenRouter free models (e.g. Llama/Mistral/Qwen
  free endpoints) → paid fallback only if configured.
- Tracks per-provider rate limits/quotas and automatically rotates/falls back so the system
  never just stops working because one free tier was exhausted.
- Lets us assign different models to different jobs (e.g. a cheap fast model for routine
  classification, a stronger one for ad-copy suggestions or conversational chat).

### 3.5 NeuraLink Dashboard (multi-user, advanced)
- Next.js + Tailwind, real-time via WebSocket.
- Login supports multiple simultaneous users/sessions, each with a role (Owner/Admin, Marketing,
  Academic/LMS admin, Viewer) controlling what the AI is allowed to do on their behalf.
- Views: Daily To-Do list (AI-generated from everything detected), Leads pipeline, Ad performance
  + suggestions, SEO health report, Event/calendar view, Activity/audit log of everything the AI
  has done.
- Chat panel with text **and voice** — push-to-talk or wake-word, speech-to-text in, TTS voice
  out, using a consistent assistant persona/name and voice (branding step — pick the name/voice
  once connectors are stable).

### 3.6 Automation Executor — browser & desktop actions
This is the most sensitive part, so it gets explicit rules:

- Built on Playwright for browser actions (navigate, click, fill forms, log into admin panels
  with credentials we provision it) and a scoped desktop-automation layer only for things like
  "open YouTube and play X" when truly needed outside the browser sandbox.
- **Every action that affects something real (accepting a student, changing an ad, posting
  content, navigating to a new site/page not already confirmed) requires one explicit
  confirmation** — voice "yes" or a click on a yes/no prompt — exactly as you described. This
  isn't a "blockage", it's the one safety gate that makes it safe to give the AI real admin
  logins. Once confirmed, it proceeds without further friction for that task.
- Every action (confirmed or not) is written to an audit log: who asked, what the AI proposed,
  what was confirmed, what happened, timestamp. This is what lets multiple people trust an AI
  with company admin accounts.
- The AI gets its own scoped admin accounts per platform (its own LMS login, etc.) rather than
  reusing a human's personal credentials — so access can be revoked/rotated independently.

### 3.7 Daily To-Do / Lead-gen / Ad-suggestion intelligence
- A nightly + every-30-min job aggregates everything connectors found into a ranked to-do list
  per user role (e.g. "3 new leads to follow up", "2 SEO fixes due", "LMS has 1 pending
  enrolment", "Ad campaign needs review").
- Lead gen: new Facebook/Meta Lead Ads submissions are pulled automatically, scored (basic
  rules first, LLM-assisted qualification later), and pushed into the dashboard + WhatsApp.
- Ad suggestions: LLM reviews campaign metrics against thresholds we define and proposes
  concrete changes (budget, audience, creative refresh) — presented for one-click approval,
  never auto-applied without confirmation (per 3.6 rule).

---

## 4. Security & reliability rules (non-negotiable, even for an "admin of company" AI)

1. Every irreversible action (money spent, student enrolment, public post, destructive edit)
   needs one confirmation step. This is the only "friction" in the system and it's what makes
   it safe — not a blocker.
2. The AI uses its own named/scoped credentials per platform, never a person's personal login.
3. Full audit trail of every action taken, viewable by all users in the dashboard.
4. Secrets (API keys, platform tokens) live in a secrets manager / env vars, never in code or
   chat logs.
5. Rate-limit and quota tracking per LLM provider so free-tier usage doesn't silently fail.
6. Each connector fails independently — one platform being down never stops WhatsApp alerts,
   the dashboard, or other connectors.

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Dashboard | Next.js + TypeScript + Tailwind | real-time UI, SSR, good AI SDK support |
| Core API | Node.js (Fastify) | shared TS types with frontend, WebSocket support |
| Scheduler | node-cron + BullMQ (Redis) | reliable recurring jobs + retry/backoff |
| Browser automation | Playwright | robust, headless/headful, works with real logins |
| DB | Postgres | relational data: users, tasks, leads, audit logs |
| Vector memory | pgvector or a managed vector DB | AI's long-term memory of company context |
| LLM access | Gemini API (free tier) + OpenRouter (free models) via router service | multi-model, cost control |
| Voice | Whisper (STT) + a TTS provider (e.g. ElevenLabs free tier or browser-native) | voice chat |
| WhatsApp | Meta WhatsApp Business Cloud API | official, scalable, same ecosystem as Meta Ads |
| Hosting | VPS/cloud (e.g. a small droplet/VM) + Docker Compose | predictable, controllable, no vendor lock-in |

---

## 6. Build phases (MVP → full vision)

**Phase 1 — Foundation (core value fast)**
- Core API + Postgres + auth (multi-user)
- Scheduler worker (30-min heartbeat) with 1 connector (website/events) to prove the loop
- WhatsApp alert pipeline (daily digest)
- LLM router with Gemini + one OpenRouter fallback

**Phase 2 — Business intelligence**
- Facebook/Meta Ads connector + lead pipeline + ad suggestions
- SEO connector + fix list
- LMS connector (read-only: list pending items first)
- Dashboard To-Do view, Leads view, SEO view

**Phase 3 — Voice & automation**
- Dashboard voice chat (STT/TTS), assistant name + persona/voice
- Automation Executor (Playwright) with the confirmation-gate flow
- LMS connector write actions (accept students) behind confirmation
- Browser task execution (e.g. "open YouTube, play X") behind confirmation

**Phase 4 — Polish & scale**
- Full audit log UI, role-based permissions refinement
- Ad-suggestion quality tuning, lead scoring
- Multi-user concurrent voice sessions, notification routing by role

---

## 7. What I need from you to start building (Phase 1)

1. **Platforms list** — exact list of: website CMS (WordPress? custom?), LMS name/platform,
   Facebook/Meta Business account access, any other tools (email, project mgmt) to monitor.
2. **WhatsApp** — do we already have a Meta WhatsApp Business API set up, or do we provision it
   fresh (requires a Meta Business account + phone number)?
3. **Hosting** — do we have a VPS/cloud account already, or do we provision one?
4. **LLM keys** — Gemini API key, OpenRouter account (free signup) — I can use placeholders and
   you fill in real keys later, but tell me which to default to first.
5. **Assistant name & voice** — final name (placeholder "NeuraLink" above) and voice style
   preference, for the branding/persona step in Phase 3.
6. **Who are the initial users** and what role should each have (owner, marketing, academic
   admin)?

Once these are answered, Phase 1 scaffolding (repo structure, auth, scheduler skeleton, first
connector, WhatsApp pipeline) can start immediately.
