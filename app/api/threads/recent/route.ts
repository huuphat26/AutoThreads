// ============================================================
// API Route: /api/threads/recent
// GET ?limit=10            → N bài gần nhất (mặc định 10)
// GET ?all=true            → Kéo hết bằng cursor pagination
// GET ?all=true&after=XXX  → Tiếp tục từ cursor
// GET ?all=true&pageSize=50&maxPages=10
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const fetchAll = searchParams.get("all") === "true";
    const accountId = searchParams.get("accountId") ?? undefined;
    const threadsService = getThreadsService(accountId);

    if (fetchAll) {
      const pageSize = Math.min(
        Number(searchParams.get("pageSize") ?? "50"),
        100,
      );
      const maxPages = Math.min(
        Number(searchParams.get("maxPages") ?? "20"),
        50,
      );
      const afterCursor = searchParams.get("after") ?? undefined;

      const result = await threadsService.getAllMyThreads({
        pageSize,
        maxPages,
        afterCursor,
      });
      return NextResponse.json({ success: true, data: result });
    }

    // Chế độ thường: lấy N bài gần nhất
    const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 100);
    const posts = await threadsService.getMyPosts(limit);
    return NextResponse.json({ success: true, data: posts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
