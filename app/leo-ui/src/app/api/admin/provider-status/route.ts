import { NextResponse } from "next/server";

type ProviderStatus = {
  ok: boolean;
  message: string;
  detail?: string;
};

async function checkOpenRouter(): Promise<ProviderStatus> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, message: "No API key configured" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (res.status === 401) return { ok: false, message: "Key is invalid or revoked" };
    if (!res.ok) return { ok: false, message: `Unexpected error (HTTP ${res.status})` };

    const data = await res.json();
    const info = data?.data;
    const limit = info?.limit;
    const remaining = info?.limit_remaining;

    if (limit != null && remaining != null && remaining <= 0) {
      return {
        ok: false,
        message: "Credit/rate limit reached",
        detail: `${remaining}/${limit} remaining`,
      };
    }

    return {
      ok: true,
      message: "Working",
      detail:
        limit != null
          ? `${remaining ?? "∞"}/${limit} remaining${info?.is_free_tier ? " · free tier" : ""}`
          : "Free tier",
    };
  } catch (err) {
    return { ok: false, message: "Couldn't reach OpenRouter", detail: String(err) };
  }
}

async function checkGemini(): Promise<ProviderStatus> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, message: "No API key configured" };

  try {
    // Lightweight auth check first — doesn't touch generation quota.
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    if (listRes.status === 400 || listRes.status === 403) {
      return { ok: false, message: "Key is invalid" };
    }
    if (!listRes.ok) {
      return { ok: false, message: `Unexpected error (HTTP ${listRes.status})` };
    }

    // Gemini doesn't expose a quota-introspection endpoint, so the only
    // reliable way to detect "rate limited" / "overloaded" is a real,
    // minimal generation call.
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      }
    );

    if (genRes.status === 429) return { ok: false, message: "Rate limit reached" };
    if (genRes.status === 503) {
      return { ok: false, message: "Model overloaded right now — try again shortly" };
    }
    if (!genRes.ok) {
      const body = await genRes.json().catch(() => null);
      return {
        ok: false,
        message: body?.error?.message ?? `Unexpected error (HTTP ${genRes.status})`,
      };
    }

    return { ok: true, message: "Working" };
  } catch (err) {
    return { ok: false, message: "Couldn't reach Gemini", detail: String(err) };
  }
}

export async function GET() {
  const [openrouter, gemini] = await Promise.all([checkOpenRouter(), checkGemini()]);
  return NextResponse.json({ openrouter, gemini, checkedAt: Date.now() });
}
