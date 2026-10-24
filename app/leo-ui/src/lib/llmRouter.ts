// Server-only. Never import this from a "use client" component — the API
// keys here must stay off the browser. The chat UI only ever talks to
// /api/chat, and never learns which provider actually answered.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are LEO, the always-on AI operator for SmartLabs. You help staff with " +
  "daily to-dos, leads, ad performance, SEO, LMS admin, and scheduling. Keep " +
  "replies short, direct, and practical. Never mention which AI model or " +
  "provider you run on.";

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

/** Tries free-tier OpenRouter models first, falls back to Gemini, then a
 * generic offline reply so the chat never just breaks. */
export async function generateReply(history: ChatMessage[]): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
  ];

  const fromOpenRouter = await tryOpenRouter(messages);
  if (fromOpenRouter) return fromOpenRouter;

  const fromGemini = await tryGemini(messages);
  if (fromGemini) return fromGemini;

  return "I'm having trouble reaching my model providers right now — try again in a moment.";
}
