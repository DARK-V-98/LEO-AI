import { NextRequest, NextResponse } from "next/server";
import { generateReply, type Attachment } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const history = body?.history;
  const context = typeof body?.context === "string" ? body.context : undefined;
  const attachments: Attachment[] | undefined = Array.isArray(body?.attachments)
    ? body.attachments
        .filter((a: unknown): a is Attachment => {
          const att = a as { data?: unknown; mimeType?: unknown };
          return typeof att?.data === "string" && typeof att?.mimeType === "string";
        })
    : undefined;

  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "history is required" }, { status: 400 });
  }

  const reply = await generateReply(history, context, attachments);
  return NextResponse.json({ reply });
}
