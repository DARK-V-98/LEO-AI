import { NextRequest, NextResponse } from "next/server";
import { scoreSpeaking, type SpeakingScoreInput, type SpeakingTaskType } from "@/lib/llmRouter";

const TASK_TYPES: SpeakingTaskType[] = [
  "read_aloud",
  "repeat_sentence",
  "describe_image",
  "retell_lecture",
  "answer_short_question",
  "respond_to_situation",
  "summarize_group_discussion",
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const taskType = typeof body?.taskType === "string" ? body.taskType : "";

  if (!TASK_TYPES.includes(taskType as SpeakingTaskType)) {
    return NextResponse.json(
      { error: `taskType must be one of: ${TASK_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
  const audioMimeType = typeof body?.audioMimeType === "string" ? body.audioMimeType : "";
  if (!audioBase64.trim() || !audioMimeType.trim()) {
    return NextResponse.json({ error: "audioBase64 and audioMimeType are required" }, { status: 400 });
  }

  const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : undefined;
  const imageMimeType = typeof body?.imageMimeType === "string" ? body.imageMimeType : undefined;
  if (taskType === "describe_image" && (!imageBase64?.trim() || !imageMimeType?.trim())) {
    return NextResponse.json(
      { error: "imageBase64 and imageMimeType are required for describe_image" },
      { status: 400 }
    );
  }

  const input: SpeakingScoreInput = {
    taskType: taskType as SpeakingTaskType,
    audioBase64,
    audioMimeType,
    referenceText: typeof body?.referenceText === "string" ? body.referenceText : undefined,
    expectedAnswer: typeof body?.expectedAnswer === "string" ? body.expectedAnswer : undefined,
    imageBase64,
    imageMimeType,
  };

  const result = await scoreSpeaking(input);
  if (!result) {
    return NextResponse.json({ error: "Speaking scoring failed or is unavailable" }, { status: 502 });
  }

  return NextResponse.json(result);
}
