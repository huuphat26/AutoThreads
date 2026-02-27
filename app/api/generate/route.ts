// ============================================
// API Route: /api/generate - Tạo nội dung AI
// Topic & slot đều tùy chọn — bỏ trống sẽ random.
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/content-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await generateContent({
      topic: body.topic, // optional — random nếu không truyền
      keywords: body.keywords,
      customPrompt: body.customPrompt,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
