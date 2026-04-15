// GET    /api/platforms/facebook/posts/[postId]  — Chi tiết bài đăng + engagement
// DELETE /api/platforms/facebook/posts/[postId]  — Xóa bài đăng
import { NextRequest, NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

type Params = { params: Promise<{ postId: string }> };

/** GET — Chi tiết post + engagement summary */
export async function GET(_req: NextRequest, { params }: Params) {
  const { postId } = await params;

  try {
    const [post, engagement] = await Promise.allSettled([
      facebookService.getPost(postId),
      facebookService.getPostEngagement(postId),
    ]);

    return NextResponse.json({
      success: true,
      post: post.status === "fulfilled" ? post.value : null,
      engagement: engagement.status === "fulfilled" ? engagement.value : null,
      error: post.status === "rejected" ? (post.reason as Error).message : null,
    });
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

/** DELETE — Xóa bài đăng */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  const { postId } = await params;

  try {
    const success = await facebookService.deletePost(postId);
    return NextResponse.json({ success });
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
