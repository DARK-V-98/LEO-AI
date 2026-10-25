// Server-only. Never import this from a "use client" component — the API
// keys here must stay off the browser. The chat UI only ever talks to
// /api/chat, and never learns which provider actually answered.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Attachment = { data: string; mimeType: string };

// What LEO can ask to have done on his behalf — the actual Firestore write
// happens wherever generateReply was called from (the WhatsApp bridge has
// Admin SDK access; this Next.js app only talks to the LLM providers and
// has none), so this is just the structured intent, not the write itself.
export type LeoAction =
  | { type: "log_lead"; name: string; contact?: string; course?: string; notes?: string }
  | { type: "create_task"; title: string; assignee?: string; dueDate?: string; notes?: string };

export type ReplyResult = { text: string; actions: LeoAction[] };

// Best-effort per-day Gemini call budget. This lives in module memory, so
// it's exact within one warm server instance and approximate across a
// redeploy/cold start or multiple concurrent instances — a soft guardrail
// against a runaway loop or an unexpectedly chatty integration blowing
// through the day's quota, not a hard metering system. A real one would
// need a shared store (Firestore/Redis) this app doesn't have write access
// to; worth adding if usage grows enough to need exact enforcement.
const GEMINI_DAILY_CALL_BUDGET = Number(process.env.GEMINI_DAILY_CALL_BUDGET ?? 1500);
let budgetDay = "";
let budgetUsed = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function withinGeminiBudget(): boolean {
  const today = todayKey();
  if (today !== budgetDay) {
    budgetDay = today;
    budgetUsed = 0;
  }
  return budgetUsed < GEMINI_DAILY_CALL_BUDGET;
}

function recordGeminiCall(): void {
  budgetUsed += 1;
}

export type SpeechResult = { audio: string; sampleRate: number };

/** Gemini's TTS model, returning raw 16-bit PCM — verified live against
 * the real API before wiring this in (gemini-2.5-flash-preview-tts returns
 * `audio/L16;codec=pcm;rate=24000`, confirmed for both English and Sinhala
 * script input). Whoever calls this is responsible for turning that into
 * whatever container/codec they actually need (the WhatsApp bridge
 * converts it to OGG/Opus for a voice note) — this app has no ffmpeg
 * available to do that itself. */
export async function generateSpeech(text: string): Promise<SpeechResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !text.trim()) return null;
  if (!withinGeminiBudget()) return null;

  try {
    recordGeminiCall();
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!part?.data) return null;
    const rateMatch = /rate=(\d+)/.exec(part.mimeType || "");
    return { audio: part.data as string, sampleRate: rateMatch ? Number(rateMatch[1]) : 24000 };
  } catch {
    return null;
  }
}

export type DocumentSource = { title: string; url: string };
export type DocumentResult = { title: string; markdown: string; sources: DocumentSource[] };

const DOCUMENT_SYSTEM_PROMPT =
  "You are LEO, SmartLabs' AI operator, now asked to research a topic and " +
  "write a short, well-organized reference document about it — the kind " +
  "a colleague could actually use, not a generic essay. If a Google Search " +
  "tool is available to you, use it to ground this in real, current " +
  "information wherever the topic calls for facts, numbers, or anything " +
  "that could be out of date in your training — don't rely on memory " +
  "alone for anything checkable. Write in Markdown: a single '# ' title " +
  "line, then '## ' section headings, short paragraphs, and '- ' bullet " +
  "lists where that's clearer than prose. Keep it factual and specific — " +
  "real numbers, names, and dates where you have them, not vague " +
  "generalities. Stay focused on exactly what was asked; don't pad it " +
  "out with filler sections. Write in whichever language the request " +
  "itself was written in.";

const DOCUMENT_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"];

/** Shared Gemini call for both a fresh document and a revision of one —
 * the only difference between those two cases is the system prompt and
 * the user-turn text, both passed in by the caller. */
async function callGeminiForDocument(
  systemPrompt: string,
  prompt: string,
  fallbackTitle: string,
  useSearch: boolean
): Promise<DocumentResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  for (const model of DOCUMENT_MODELS) {
    if (!withinGeminiBudget()) return null;
    try {
      recordGeminiCall();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const parts: Array<{ text?: string }> = candidate?.content?.parts ?? [];
      const markdown = parts
        .map((p) => p.text)
        .filter((t): t is string => typeof t === "string")
        .join("\n")
        .trim();
      if (!markdown) continue;

      const titleMatch = /^#\s+(.+)$/m.exec(markdown);
      const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;

      const chunks: Array<{ web?: { uri?: string; title?: string } }> =
        candidate?.groundingMetadata?.groundingChunks ?? [];
      const seen = new Set<string>();
      const sources: DocumentSource[] = [];
      for (const chunk of chunks) {
        const uri = chunk?.web?.uri;
        if (uri && !seen.has(uri)) {
          seen.add(uri);
          sources.push({ title: chunk.web?.title || uri, url: uri });
        }
      }

      return { title, markdown, sources };
    } catch {
      continue;
    }
  }
  return null;
}

/** Researches a topic (grounded with Google Search when the model
 * supports it) and writes it up as a Markdown document. Falls back to a
 * plain (non-grounded) generation if the search tool isn't accepted by
 * any available model, rather than failing outright — a document from
 * the model's own knowledge still beats no document. Whoever calls this
 * (the WhatsApp bridge) is responsible for turning the Markdown into
 * whatever file format it actually sends. */
export async function generateDocument(
  topic: string,
  context?: string
): Promise<DocumentResult | null> {
  if (!topic.trim()) return null;
  const prompt = context?.trim()
    ? `${context.trim()}\n\nWrite the document now. Topic: ${topic.trim()}`
    : `Write the document now. Topic: ${topic.trim()}`;
  return (
    (await callGeminiForDocument(DOCUMENT_SYSTEM_PROMPT, prompt, topic.trim(), true)) ??
    (await callGeminiForDocument(DOCUMENT_SYSTEM_PROMPT, prompt, topic.trim(), false))
  );
}

const DOCUMENT_REVISE_SYSTEM_PROMPT =
  "You are LEO, revising a document you wrote earlier based on specific " +
  "feedback. You'll be given the full current document (in Markdown) and " +
  "an instruction describing exactly what to change. Apply only what was " +
  "asked — add, remove, or rewrite the specific part requested — and " +
  "leave everything else in the document exactly as it was; don't " +
  "rewrite unrelated sections or restructure things that weren't asked " +
  "about. If a Google Search tool is available and the request needs a " +
  "fact you don't already have, use it. Return the COMPLETE updated " +
  "document, not just the changed part, in the same Markdown format: a " +
  "single '# ' title line, '## ' section headings, short paragraphs, and " +
  "'- ' bullet lists. Keep the same language the original document is " +
  "written in, unless the instruction explicitly asks to change it.";

/** Applies a specific requested change to a document LEO already wrote,
 * returning the complete updated Markdown (not a diff) — so the caller
 * can just re-render and re-send the whole thing. Same grounded-then-
 * plain-fallback shape as generateDocument. */
export async function reviseDocument(
  previousMarkdown: string,
  instruction: string,
  context?: string
): Promise<DocumentResult | null> {
  if (!previousMarkdown.trim() || !instruction.trim()) return null;
  const fallbackTitleMatch = /^#\s+(.+)$/m.exec(previousMarkdown);
  const fallbackTitle = fallbackTitleMatch ? fallbackTitleMatch[1].trim() : "Updated document";
  const prompt =
    (context?.trim() ? `${context.trim()}\n\n` : "") +
    `Current document:\n\n${previousMarkdown.trim()}\n\n---\n\n` +
    `Requested change: ${instruction.trim()}\n\nReturn the complete updated document now.`;
  return (
    (await callGeminiForDocument(DOCUMENT_REVISE_SYSTEM_PROMPT, prompt, fallbackTitle, true)) ??
    (await callGeminiForDocument(DOCUMENT_REVISE_SYSTEM_PROMPT, prompt, fallbackTitle, false))
  );
}

const SYSTEM_PROMPT =
  "You are LEO, the always-on AI operator for SmartLabs. You help staff with " +
  "daily to-dos, leads, ad performance, SEO, LMS admin, and scheduling. Keep " +
  "replies short, direct, and practical. Never mention which AI model or " +
  "provider you run on. You are fully fluent in both English and Sinhala " +
  "(සිංහල). Always reply in the same language the user's latest message is " +
  "written in — if they write or speak in Sinhala, reply entirely in " +
  "Sinhala script, not transliterated or translated to English; if they " +
  "use English, reply in English. Many people here type Sinhala phonetically " +
  "in English letters instead of Sinhala script (e.g. 'kohomada', 'oyata " +
  "monawada one', 'mata eka kiyanna puluwanda') — understand that exactly " +
  "the same as if it were written in Sinhala script, and reply in proper " +
  "Sinhala script (not Singlish back, not English) unless they've shown a " +
  "clear preference for Singlish specifically. Keep Sinhala replies " +
  "natural and conversational, the way a Sri Lankan colleague would " +
  "actually speak, not a stiff literal translation. You cannot generate images yourself " +
  "in this chat, but on WhatsApp you can: if asked (here or on WhatsApp) " +
  "to make a poster, flyer, or image, tell them to message you on " +
  "WhatsApp with 'poster: <description>' (e.g. 'poster: SmartLabs AI " +
  "Diploma open house, blue theme') and it will be generated and sent " +
  "back automatically — don't just say you can't do it. If asked to " +
  "translate something, or what a message in another language means, " +
  "just translate it directly rather than replying in the target " +
  "language for the rest of the conversation. If you're not confident " +
  "you understood a request correctly — ambiguous phrasing, a likely " +
  "mis-transcribed voice message, or a name/number you're guessing at — " +
  "say so and ask a quick clarifying question instead of guessing " +
  "silently and risking a wrong action (especially before logging a " +
  "lead or creating a task). On WhatsApp, a reply with a blank line " +
  "between two distinct thoughts gets sent as separate messages, the " +
  "way a person continuing a conversation sends a couple of messages " +
  "in a row rather than one big block — use that naturally for a " +
  "multi-part answer (e.g. a quick acknowledgement, then the actual " +
  "result), but don't force a split where one short reply is enough. " +
  "If you're given a list of real courses SmartLabs currently offers, " +
  "treat it as the complete, authoritative catalog — never mention, " +
  "confirm, or imply a course exists if it isn't on that list, even if " +
  "it sounds like something a place like this would plausibly teach. " +
  "If asked about a course that isn't listed, say plainly it's not " +
  "currently offered rather than guessing or inventing details about it. " +
  "This applies to any SmartLabs-specific number or fact you weren't " +
  "actually given — how many students are registered, enrollment counts, " +
  "revenue, schedules, staff details, anything like that. You have no " +
  "general ability to look those up; if it wasn't handed to you in this " +
  "conversation's context, say plainly that you don't have a way to " +
  "check that right now, rather than stating a specific-sounding number " +
  "or fact that you don't actually know.";

// Free-tier OpenRouter models, tried in order until one responds. Picked
// from a live /api/admin/openrouter-models check (not from training-data
// memory, which predates all of these releases) and researched before
// picking: strongest general-purpose free models first, lighter/faster
// ones as quick fallbacks, OpenRouter's own auto-router as a last resort
// before falling through to Gemini.
const OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
];

async function tryOpenRouter(messages: ChatMessage[]): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://leo-ai.smartlabs",
          "X-Title": "LEO AI",
        },
        body: JSON.stringify({ model, messages, temperature: 0.6 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return text as string;
    } catch {
      // network/provider hiccup — fall through to the next free model
      continue;
    }
  }
  return null;
}

// Function declarations for Gemini's native tool-calling — this is what
// lets "hey I just got a call from a student asking about the AI diploma,
// log them as a lead" turn into an actual Firestore write instead of
// needing an exact regex phrasing like the poster/reminder commands do.
const LEO_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "log_lead",
        description:
          "Log a new sales/admissions lead mentioned in the conversation — someone interested in a course or program who should be followed up with. Only call this for an actual new lead, not a hypothetical or past example.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "The lead's name, if known." },
            contact: { type: "string", description: "Phone number, email, or other contact detail, if known." },
            course: { type: "string", description: "The course/program they're interested in, if mentioned." },
            notes: { type: "string", description: "Any other relevant detail from the conversation." },
          },
          required: ["name"],
        },
      },
      {
        name: "create_task",
        description:
          "Create a to-do item for the team — something someone asked to have tracked or assigned, e.g. 'tell the design team to prep the banner by Friday'. Only call this for an explicit request to track/assign work, not general conversation.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short description of the task." },
            assignee: { type: "string", description: "Who it's for, if mentioned (a name or team)." },
            dueDate: { type: "string", description: "Due date/time as mentioned, in natural language (e.g. 'Friday', 'tomorrow 5pm'). Leave out if not mentioned." },
            notes: { type: "string", description: "Any other relevant detail." },
          },
          required: ["title"],
        },
      },
    ],
  },
];

function parseActions(
  parts: Array<{ functionCall?: { name: string; args: Record<string, unknown> } }>
): LeoAction[] {
  const actions: LeoAction[] = [];
  for (const part of parts) {
    const call = part.functionCall;
    if (!call) continue;
    if (call.name === "log_lead" && typeof call.args?.name === "string") {
      actions.push({
        type: "log_lead",
        name: call.args.name as string,
        contact: typeof call.args.contact === "string" ? call.args.contact : undefined,
        course: typeof call.args.course === "string" ? call.args.course : undefined,
        notes: typeof call.args.notes === "string" ? call.args.notes : undefined,
      });
    } else if (call.name === "create_task" && typeof call.args?.title === "string") {
      actions.push({
        type: "create_task",
        title: call.args.title as string,
        assignee: typeof call.args.assignee === "string" ? call.args.assignee : undefined,
        dueDate: typeof call.args.dueDate === "string" ? call.args.dueDate : undefined,
        notes: typeof call.args.notes === "string" ? call.args.notes : undefined,
      });
    }
  }
  return actions;
}

function confirmationFor(action: LeoAction): string {
  if (action.type === "log_lead") {
    return `Logged ${action.name}${action.course ? ` as a lead for ${action.course}` : " as a lead"}.`;
  }
  return `Added the task: ${action.title}${action.assignee ? ` (for ${action.assignee})` : ""}.`;
}

async function tryGemini(
  messages: ChatMessage[],
  attachments?: Attachment[],
  useTools = false
): Promise<{ text: string; actions: LeoAction[] } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!withinGeminiBudget()) return null;

  const nonSystem = messages.filter((m) => m.role !== "system");
  const contents = nonSystem.map((m, i) => {
    const isLast = i === nonSystem.length - 1;
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    // Attachments (an image, voice message, or document) apply to the
    // current turn — the last message in the history — not the whole
    // conversation.
    if (isLast && attachments?.length) {
      for (const a of attachments) {
        parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
      }
    }
    parts.push({ text: m.content || "(see attached)" });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const system = messages.find((m) => m.role === "system")?.content;

  // Ordered by reliability we've observed, not just capability — the
  // newest preview models are often rate-limited/overloaded on the free tier.
  const GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-2.5-flash",
  ];

  for (const model of GEMINI_MODELS) {
    try {
      recordGeminiCall();
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            ...(system
              ? { systemInstruction: { parts: [{ text: system }] } }
              : {}),
            ...(useTools ? { tools: LEO_TOOLS } : {}),
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.find((p: { text?: string }) => typeof p.text === "string")?.text;
      const actions = useTools ? parseActions(parts) : [];
      if (text) return { text, actions };
      if (actions.length > 0) {
        // Gemini called a function with no accompanying text — synthesize
        // a confirmation locally rather than round-tripping the function
        // result back for a second generation call (not worth the extra
        // latency/cost for a simple "logged it" acknowledgement).
        return { text: actions.map(confirmationFor).join(" "), actions };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Gemini goes first for every message, not just detected Sinhala/Singlish
 * ones — most of this team's day-to-day chat is in Sinhala or Singlish,
 * and the free OpenRouter models are noticeably worse at both than Gemini
 * is, so there's no real upside to trying them first anymore. OpenRouter
 * is only the fallback when Gemini itself is unavailable or out of quota,
 * and a generic offline reply after that so the chat never just breaks. */
export async function generateReply(
  history: ChatMessage[],
  context?: string,
  attachments?: Attachment[]
): Promise<ReplyResult> {
  const systemContent = context?.trim()
    ? `${SYSTEM_PROMPT}\n\n${context.trim()}`
    : SYSTEM_PROMPT;
  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history,
  ];

  // Image/audio/document understanding needs a provider actually verified
  // to support it — go straight to Gemini rather than trying free
  // OpenRouter models first, most of which don't handle multimodal input
  // reliably. No tool-calling here: a lead/task worth logging comes up in
  // normal conversation, not inside a voice note transcript or a photo.
  if (attachments && attachments.length > 0) {
    const fromGemini = await tryGemini(messages, attachments);
    return (
      fromGemini ?? {
        text: "I couldn't process that image/voice message right now — try again shortly.",
        actions: [],
      }
    );
  }

  const fromGemini = await tryGemini(messages, undefined, true);
  if (fromGemini) return fromGemini;

  const fromOpenRouter = await tryOpenRouter(messages);
  if (fromOpenRouter) return { text: fromOpenRouter, actions: [] };

  return {
    text: "I'm having trouble reaching my model providers right now — try again in a moment.",
    actions: [],
  };
}
