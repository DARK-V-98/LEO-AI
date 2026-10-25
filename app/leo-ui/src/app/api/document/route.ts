import { NextRequest, NextResponse } from "next/server";
import { generateDocument } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
  const context = typeof body?.context === "string" ? body.context : undefined;
  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const result = await generateDocument(topic, context);
  if (!result) {
    return NextResponse.json({ error: "Document generation failed or is unavailable" }, { status: 502 });
  }

  // Markdown, not a finished file — the caller (the WhatsApp bridge) turns
  // this into a PDF to actually send, since that's where the PDF library
  // lives.
  return NextResponse.json({ title: result.title, markdown: result.markdown, sources: result.sources });
}
