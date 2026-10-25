import { NextRequest, NextResponse } from "next/server";
import { generateDocument, reviseDocument } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const context = typeof body?.context === "string" ? body.context : undefined;
  const previousMarkdown = typeof body?.previousMarkdown === "string" ? body.previousMarkdown : "";
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";

  // A revision of a document LEO already wrote — sent together, since a
  // revision needs the old Markdown to work from, not just a fresh topic.
  if (previousMarkdown && instruction) {
    const result = await reviseDocument(previousMarkdown, instruction, context);
    if (!result) {
      return NextResponse.json({ error: "Document revision failed or is unavailable" }, { status: 502 });
    }
    return NextResponse.json({ title: result.title, markdown: result.markdown, sources: result.sources });
  }

  const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
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
