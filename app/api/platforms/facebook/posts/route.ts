// GET  /api/platforms/facebook/posts      — Danh sách bài đăng trên page
// POST /api/platforms/facebook/posts      — Đăng bài text mới lên page feed
import { NextRequest, NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

/** GET — Lấy danh sách bài đăng */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 100);
  const after = searchParams.get("after") ?? undefined;

  try {
    const result = await facebookService.getPosts(limit, after);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

/** POST — Đăng bài text lên page */
export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { message } = body as { message?: string };

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Trường 'message' không được để trống" },
        { status: 400 },
      );
    }

    const result = await facebookService.publishText(message.trim());
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
