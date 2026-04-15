// ============================================================
// API Route: /api/threads/post/[postId]
// Tra cứu bài đăng + insights theo post ID
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import { threadsService } from "@/lib/services/threads.service";

type Params = { params: Promise<{ postId: string }> };

// GET /api/threads/post/:postId
// Query: ?insights=true  → lấy thêm insights (views, likes, replies...)
//        ?detail=true    → gộp cả post + insights (dùng getPostDetail)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { postId } = await params;
    const wantDetail = req.nextUrl.searchParams.get("detail") === "true";
    const wantInsights = req.nextUrl.searchParams.get("insights") === "true";

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Thiếu postId" },
        { status: 400 },
      );
    }

    // ── detail=true: trả về post + insights gộp (gọi song song) ──
    if (wantDetail) {
      const detail = await threadsService.getPostDetail(postId);
      return NextResponse.json({ success: true, data: detail });
    }

    // ── Mặc định: lấy chi tiết bài đăng ──
    const post = await threadsService.getPost(postId);

    // insights=true → lấy thêm số liệu
    let insights = undefined;
    if (wantInsights) {
      try {
        insights = await threadsService.getMediaInsights(postId);
      } catch {
        insights = {
          error: "Không thể lấy insights (cần quyền threads_manage_insights)",
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: { post, insights },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// DELETE /api/threads/post/:postId — Xóa bài đăng
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { postId } = await params;
    const deleted = await threadsService.deletePost(postId);
    return NextResponse.json({
      success: true,
      data: { deleted, postId },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
