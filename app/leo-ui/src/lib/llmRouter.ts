// Server-only. Never import this from a "use client" component — the API
// keys here must stay off the browser. The chat UI only ever talks to
// /api/chat, and never learns which provider actually answered.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are LEO, the always-on AI operator for SmartLabs. You help staff with " +
  "daily to-dos, leads, ad performance, SEO, LMS admin, and scheduling. Keep " +
  "replies short, direct, and practical. Never mention which AI model or " +
  "provider you run on. You are fully fluent in both English and Sinhala " +
  "(සිංහල). Always reply in the same language the user's latest message is " +
  "written in — if they write or speak in Sinhala, reply entirely in " +
  "Sinhala script, not transliterated or translated to English; if they " +
  "use English, reply in English. Keep Sinhala replies natural and " +
  "conversational, the way a Sri Lankan colleague would actually speak, " +
  "not a stiff literal translation. You cannot generate images yourself " +
  "in this chat, but on WhatsApp you can: if asked (here or on WhatsApp) " +
  "to make a poster, flyer, or image, tell them to message you on " +
  "WhatsApp with 'poster: <description>' (e.g. 'poster: SmartLabs AI " +
  "Diploma open house, blue theme') and it will be generated and sent " +
  "back automatically — don't just say you can't do it.";

// Free-tier OpenRouter models, tried in order until one responds.
const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen3-14b:free",
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

async function tryGemini(messages: ChatMessage[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
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
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text as string;
    } catch {
      continue;
    }
  }
  return null;
}

// Sinhala Unicode block.
const SINHALA_PATTERN = /[඀-෿]/;

/** Tries free-tier OpenRouter models first, falls back to Gemini, then a
 * generic offline reply so the chat never just breaks. For Sinhala, Gemini
 * goes first instead — the free OpenRouter models are noticeably weaker at
 * it than Gemini is. */
export async function generateReply(history: ChatMessage[], context?: string): Promise<string> {
  const systemContent = context?.trim()
    ? `${SYSTEM_PROMPT}\n\n${context.trim()}`
    : SYSTEM_PROMPT;
  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history,
  ];

  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");
  const isSinhala = lastUserMessage ? SINHALA_PATTERN.test(lastUserMessage.content) : false;

  if (isSinhala) {
    const fromGemini = await tryGemini(messages);
    if (fromGemini) return fromGemini;
    const fromOpenRouter = await tryOpenRouter(messages);
    if (fromOpenRouter) return fromOpenRouter;
  } else {
    const fromOpenRouter = await tryOpenRouter(messages);
    if (fromOpenRouter) return fromOpenRouter;
    const fromGemini = await tryGemini(messages);
    if (fromGemini) return fromGemini;
  }

  return "I'm having trouble reaching my model providers right now — try again in a moment.";
}
