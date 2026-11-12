import { NextRequest, NextResponse } from "next/server";
import { scoreEssay, transcribeHandwriting } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === "string" ? body.topic.trim() : undefined;

  // Either typed text, or a photo of a handwritten essay to transcribe
  // first — the caller (the WhatsApp bridge) sends whichever it has.
  let essay = typeof body?.essay === "string" ? body.essay.trim() : "";
  const image =
    body?.image?.data && typeof body.image.data === "string"
      ? { data: body.image.data as string, mimeType: (body.image.mimeType as string) || "image/jpeg" }
      : null;

  if (!essay && image) {
    const transcript = await transcribeHandwriting(image.data, image.mimeType);
    if (!transcript) {
      return NextResponse.json({ error: "Couldn't read the handwriting in that photo" }, { status: 502 });
    }
    essay = transcript;
  }

  if (!essay) {
    return NextResponse.json({ error: "essay (or image) is required" }, { status: 400 });
  }

  const result = await scoreEssay(essay, topic);
  if (!result) {
    return NextResponse.json({ error: "Essay scoring failed or is unavailable" }, { status: 502 });
  }

  // Echo the transcript back too, when scored from a photo — the caller
  // wants to store/show what was actually read, not just the scores.
  return NextResponse.json({ ...result, transcript: image ? essay : undefined });
}
