// ============================================================
// API Route: /api/threads/recent - Bài đăng gần đây
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { threadsService } from "@/lib/services/threads.service";

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "10");
    const posts = await threadsService.getMyPosts(Math.min(limit, 100));
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
