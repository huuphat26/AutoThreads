// ============================================
// API Route: /api/history - Lịch sử bài đăng
// ============================================
import { NextResponse } from "next/server";
import { readHistory, getStats } from "@/lib/store";

export async function GET() {
  try {
    const history = readHistory();
    const stats = getStats();
    return NextResponse.json({
      success: true,
      data: {
        posts: history.posts.slice(0, 50), // 50 bài gần nhất
        stats,
        lastUpdated: history.lastUpdated,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
