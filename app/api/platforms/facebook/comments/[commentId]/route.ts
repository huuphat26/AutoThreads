// POST   /api/platforms/facebook/comments/[commentId]  — Reply vào comment
// PATCH  /api/platforms/facebook/comments/[commentId]  — Ẩn/hiện comment
// DELETE /api/platforms/facebook/comments/[commentId]  — Xóa comment
//
// GET /api/platforms/facebook/comments/[commentId]?postId=X — List comments của post
import { NextRequest, NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";

type Params = { params: Promise<{ commentId: string }> };

/** GET — Lấy danh sách comments; commentId = postId trong trường hợp này */
export async function GET(req: NextRequest, { params }: Params) {
  const { commentId: postId } = await params;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");

  try {
    const comments = await facebookService.getPostComments(postId, limit);
    return NextResponse.json({ success: true, data: comments });
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

/** POST — Reply vào comment */
export async function POST(req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  try {
    const body = await req.json();
    const { message } = body as { message?: string };

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Trường 'message' không được để trống" },
        { status: 400 },
      );
    }

    const replyId = await facebookService.replyToComment(
      commentId,
      message.trim(),
    );
    return NextResponse.json({ success: true, replyId });
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

/** PATCH — Ẩn hoặc hiện comment */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  try {
    const body = await req.json();
    const { hide } = body as { hide?: boolean };

    if (typeof hide !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Trường 'hide' phải là boolean" },
        { status: 400 },
      );
    }

    const ok = await facebookService.hideComment(commentId, hide);
    return NextResponse.json({ success: ok });
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

/** DELETE — Xóa comment */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  try {
    const ok = await facebookService.deleteComment(commentId);
    return NextResponse.json({ success: ok });
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
