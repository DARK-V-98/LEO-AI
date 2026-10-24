import { NextRequest, NextResponse } from "next/server";

// Billing-gated Gemini image models — the free tier has zero quota for
// all of these, confirmed by testing against the live API.
const IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image"];

type ReferenceImage = { data: string; mimeType?: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const referenceImage: ReferenceImage | null =
    body?.referenceImage?.data && typeof body.referenceImage.data === "string"
      ? { data: body.referenceImage.data, mimeType: body.referenceImage.mimeType }
      : null;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Image generation isn't configured" }, { status: 500 });
  }

  const posterPrompt = referenceImage
    ? `Using the attached reference image for style, branding, colors and/or ` +
      `layout, design a new poster image for the following: ${prompt}. Keep it ` +
      `visually consistent with the reference. High quality, well-balanced ` +
      `composition, legible if it includes text, suitable for social media and print.`
    : `Design a clean, professional poster image for the following: ${prompt}. ` +
      `High quality, well-balanced composition, legible if it includes text, ` +
      `suitable for social media and print.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (referenceImage) {
    parts.push({
      inlineData: { mimeType: referenceImage.mimeType || "image/jpeg", data: referenceImage.data },
    });
  }
  parts.push({ text: posterPrompt });

  for (const model of IMAGE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts }] }),
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const resultParts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = resultParts.find(
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
