// POST   /api/platforms/instagram/comments/[commentId] — Reply to comment
// PATCH  /api/platforms/instagram/comments/[commentId] — Hide/unhide comment
// DELETE /api/platforms/instagram/comments/[commentId] — Delete comment
import { NextRequest, NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

type Ctx = { params: Promise<{ commentId: string }> };

// Reply to a comment
export async function POST(req: NextRequest, { params }: Ctx) {
  const { commentId } = await params;
  const body = await req.json().catch(() => ({}));
  const message: string = body.message ?? "";

  if (!message.trim()) {
    return NextResponse.json(
      { success: false, error: "Thiếu nội dung reply (message)" },
      { status: 400 },
    );
  }

  try {
    const replyId = await instagramService.replyToComment(commentId, message);
    return NextResponse.json({ success: true, data: { id: replyId } });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}

// Hide / unhide comment
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { commentId } = await params;
  const body = await req.json().catch(() => ({}));
  const hide: boolean = body.hide ?? true;

  try {
    const ok = await instagramService.hideComment(commentId, hide);
    return NextResponse.json({ success: ok });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}

// Delete a comment
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { commentId } = await params;

  try {
    const ok = await instagramService.deleteComment(commentId);
    return NextResponse.json({ success: ok });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}
