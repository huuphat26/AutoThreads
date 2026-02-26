// ============================================
// API Route: /api/post - Đăng bài lên Threads
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { postToThreads } from "@/lib/threads-api";
import { upsertPost, generateId } from "@/lib/store";
import type { PostSlot, ContentTopic } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, slot, topic } = body as {
      content: string;
      slot: PostSlot;
      topic: ContentTopic;
    };

    if (!content) {
      return NextResponse.json(
        { success: false, error: "Thiếu nội dung bài đăng" },
        { status: 400 },
      );
    }

    const postId = generateId();
    const now = new Date().toISOString();

    // Lưu trạng thái pending trước
    upsertPost({
      id: postId,
      content,
      topic: topic || "marketing",
      slot: slot || "morning",
      scheduledAt: now,
      status: "pending",
    });

    // Đăng lên Threads
    const threadsPostId = await postToThreads(content);

    // Cập nhật thành công
    upsertPost({
      id: postId,
      content,
      topic: topic || "marketing",
      slot: slot || "morning",
      scheduledAt: now,
      postedAt: new Date().toISOString(),
      threadsPostId,
      status: "posted",
    });

    return NextResponse.json({
      success: true,
      data: { postId, threadsPostId, postedAt: new Date().toISOString() },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
