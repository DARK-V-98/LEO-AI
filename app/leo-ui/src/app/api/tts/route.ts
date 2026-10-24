import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = await generateSpeech(text);
  if (!result) {
    return NextResponse.json({ error: "Speech generation failed or is unavailable" }, { status: 502 });
  }

  // Raw PCM, not a finished audio file — the caller (the WhatsApp bridge)
  // converts this to whatever it actually needs (OGG/Opus for a voice
  // note), since this app has no ffmpeg available to do that itself.
  return NextResponse.json({ audio: result.audio, sampleRate: result.sampleRate, encoding: "pcm_s16le" });
}
