import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/lib/llmRouter";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const history = body?.history;

  if (!Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "history is required" }, { status: 400 });
  }

  const reply = await generateReply(history);
  return NextResponse.json({ reply });
}
