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

  // The model defaults to "generic AI stock image" unless explicitly told
  // to think like a designer, not an illustrator — this is a deliberate,
  // detailed design brief, not just "make it nice."
  const DESIGN_DIRECTION =
    "Think like an award-winning graphic designer laying this out in " +
    "Figma, not an image model asked to \"draw a poster\" — this should " +
    "read as something a design studio shipped, not a generic AI-generated " +
    "image. Apply real design discipline: ONE clear focal point and a " +
    "deliberate visual hierarchy, where the single most important " +
    "element (usually the headline) is unmistakably the biggest/boldest " +
    "and everything else visibly supports it, not competes with it. A " +
    "tight, intentional color palette — 2 to 3 colors used consistently " +
    "throughout, not a scattershot mix — with strong, confident contrast " +
    "between foreground and background. Generous, deliberate negative " +
    "space; don't fill every inch of the canvas. Clean alignment to an " +
    "implied grid — edges and text blocks line up with each other, " +
    "nothing scattered at random angles or crammed into a corner. If " +
    "there's any text, give it real typographic hierarchy (headline, " +
    "subheading, body clearly distinct in size/weight), keep the wording " +
    "short, and make sure it's fully legible — strong contrast against " +
    "its background, never lost over busy imagery, no warped or " +
    "nonsensical lettering. Balanced, considered composition (rule of " +
    "thirds or deliberate symmetry), not an awkward empty corner or a " +
    "lopsided arrangement. One cohesive visual style throughout — don't " +
    "mix photorealistic and flat-illustration elements unless asked to. " +
    "Avoid the common AI-art tells: no cluttered or busy background " +
    "competing with the message, no generic clip-art look, no random " +
    "decorative elements that don't serve the composition.";

  const posterPrompt = referenceImage
    ? `${DESIGN_DIRECTION}\n\nUsing the attached reference image for style, ` +
      `branding, colors and/or layout, design a new poster image for the ` +
      `following, staying visually consistent with that reference: ${prompt}. ` +
      `High quality, suitable for social media and print.`
    : `${DESIGN_DIRECTION}\n\nDesign a poster image for the following: ${prompt}. ` +
      `High quality, suitable for social media and print.`;

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
