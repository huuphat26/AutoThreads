// ============================================================
// API Route: /api/threads/post/[postId]
// Tra cứu bài đăng + insights theo post ID
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { threadsService } from "@/lib/services/threads.service";

type Params = { params: Promise<{ postId: string }> };

// GET /api/threads/post/:postId
// Query: ?insights=true để lấy thêm số liệu
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { postId } = await params;
    const withInsights = req.nextUrl.searchParams.get("insights") === "true";

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Thiếu postId" },
        { status: 400 },
      );
    }

    // Lấy chi tiết bài đăng
    const post = await threadsService.getPost(postId);

    // Nếu có query ?insights=true thì lấy thêm số liệu
    let insights = undefined;
    if (withInsights) {
      try {
        insights = await threadsService.getPostInsights(postId);
      } catch {
        // Insights có thể thất bại nếu thiếu quyền threads_manage_insights
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
  // Bảo vệ bằng secret
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
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
