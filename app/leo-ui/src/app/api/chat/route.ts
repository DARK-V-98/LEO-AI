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

  const result = await generateReply(history, context, attachments);
  // `reply` stays a plain string — every existing caller (the web chat UI,
  // the WhatsApp bridge's askLeo) reads it that way. `actions` is new and
  // additive: only a caller that knows to look (currently just the bridge,
  // which has the Firestore Admin access needed to actually act on them)
  // does anything with it.
  return NextResponse.json({ reply: result.text, actions: result.actions });
}
