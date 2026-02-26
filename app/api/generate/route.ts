// ============================================
// API Route: /api/generate - Tạo nội dung AI
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { generateContent, getTopicForSlot } from "@/lib/content-generator";
import type { ContentTopic, PostSlot } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slot: PostSlot = body.slot || "morning";
    const topic: ContentTopic = body.topic || getTopicForSlot(slot);
    const keywords: string[] = body.keywords || [];
    const customPrompt: string = body.customPrompt || "";

    const result = await generateContent({
      topic,
      slot,
      keywords,
      customPrompt,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
