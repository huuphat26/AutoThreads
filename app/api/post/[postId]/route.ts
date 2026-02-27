// ============================================
// API Route: DELETE /api/post/[postId]
// Xóa bài khỏi local store + Threads (nếu có threadsId)
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { removePost } from "@/lib/store";
import { deleteThreadsPost } from "@/lib/threads-api";

type Params = { params: Promise<{ postId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { postId } = await params;
    const threadsId = req.nextUrl.searchParams.get("threadsId");

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Thiếu postId" },
        { status: 400 },
      );
    }

    // Xóa trên Threads nếu có threadsPostId
    let threadsDeleted = false;
    if (threadsId) {
      try {
        threadsDeleted = await deleteThreadsPost(threadsId);
      } catch {
        // Bài có thể đã bị xóa trên Threads — tiếp tục xóa local
      }
    }

    // Xóa khỏi local store
    const localDeleted = removePost(postId);

    return NextResponse.json({
      success: true,
      data: { postId, threadsDeleted, localDeleted },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
