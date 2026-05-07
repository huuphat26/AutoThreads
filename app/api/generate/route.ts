// ============================================
// API Route: /api/generate - Tạo nội dung AI
// Topic & slot đều tùy chọn — bỏ trống sẽ random.
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/content-generator";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { success: false, error: "AI logic has been disabled by user request." },
    { status: 403 },
  );
}
