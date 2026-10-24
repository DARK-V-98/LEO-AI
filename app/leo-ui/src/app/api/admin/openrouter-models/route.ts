import { NextResponse } from "next/server";

type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
};

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No OpenRouter API key configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (res.status === 401) {
      return NextResponse.json({ error: "Key is invalid or revoked" }, { status: 401 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Unexpected error (HTTP ${res.status})` }, { status: 502 });
    }

    const data = await res.json();
    const models: OpenRouterModel[] = Array.isArray(data?.data) ? data.data : [];

    const normalized = models.map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      contextLength: m.context_length ?? null,
      isFree: m.pricing?.prompt === "0" && m.pricing?.completion === "0",
    }));

    const freeModels = normalized
      .filter((m) => m.isFree)
      .sort((a, b) => a.id.localeCompare(b.id));
    const paidModels = normalized.filter((m) => !m.isFree);

    return NextResponse.json({
      totalModels: normalized.length,
      freeModelCount: freeModels.length,
      paidModelCount: paidModels.length,
      freeModels,
      checkedAt: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't reach OpenRouter" },
      { status: 502 }
    );
  }
}
