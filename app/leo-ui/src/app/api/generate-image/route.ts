import { NextRequest, NextResponse } from "next/server";

// Billing-gated Gemini image models — the free tier has zero quota for
// all of these, confirmed by testing against the live API.
const IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Image generation isn't configured" }, { status: 500 });
  }

  const posterPrompt =
    `Design a clean, professional poster image for the following: ${prompt}. ` +
    "High quality, well-balanced composition, legible if it includes text, suitable for social media and print.";

  for (const model of IMAGE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: posterPrompt }] }],
          }),
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data
      );
      if (imagePart?.inlineData?.data) {
        return NextResponse.json({
          image: imagePart.inlineData.data, // base64
          mimeType: imagePart.inlineData.mimeType || "image/png",
          model,
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: "Couldn't generate an image right now — try again shortly." },
    { status: 502 }
  );
}
