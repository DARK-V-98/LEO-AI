import { NextRequest, NextResponse } from "next/server";
import {
  scoreWriting,
  PTE_WRITE_ESSAY_RUBRIC,
  PTE_SUMMARIZE_WRITTEN_TEXT_RUBRIC,
  type Rubric,
} from "@/lib/llmRouter";

const RUBRICS: Record<string, Rubric> = {
  [PTE_WRITE_ESSAY_RUBRIC.id]: PTE_WRITE_ESSAY_RUBRIC,
  [PTE_SUMMARIZE_WRITTEN_TEXT_RUBRIC.id]: PTE_SUMMARIZE_WRITTEN_TEXT_RUBRIC,
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const rubricId = typeof body?.rubricId === "string" ? body.rubricId : "";
  const topic = typeof body?.topic === "string" ? body.topic.trim() : undefined;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const rubric = RUBRICS[rubricId];
  if (!rubric) {
    return NextResponse.json(
      { error: `rubricId must be one of: ${Object.keys(RUBRICS).join(", ")}` },
      { status: 400 }
    );
  }

  const result = await scoreWriting(text, rubric, topic);
  if (!result) {
    return NextResponse.json({ error: "Writing scoring failed or is unavailable" }, { status: 502 });
  }

  return NextResponse.json(result);
}
