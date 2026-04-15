// ============================================
// API Route: /api/post - Đăng bài lên Threads
// Hỗ trợ: TEXT, IMAGE, VIDEO
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { postMediaToThreads } from "@/lib/threads-api";
import { upsertPost, generateId } from "@/lib/store";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import type { ContentTopic, ThreadsMediaType } from "@/types";

export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { content, topic, topicLabel, mediaType, imageUrl, videoUrl } =
      body as {
        content: string;
        topic: ContentTopic;
        topicLabel?: string;
        mediaType?: ThreadsMediaType;
        imageUrl?: string;
        videoUrl?: string;
      };

    if (!content && mediaType !== "IMAGE" && mediaType !== "VIDEO") {
      return NextResponse.json(
        { success: false, error: "Thiếu nội dung bài đăng" },
        { status: 400 },
      );
    }

    if (mediaType === "IMAGE" && !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu URL hình ảnh (imageUrl)" },
        { status: 400 },
      );
    }

    if (mediaType === "VIDEO" && !videoUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu URL video (videoUrl)" },
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
      scheduledAt: now,
      status: "pending",
      topicLabel,
      mediaType: mediaType || "TEXT",
      imageUrl,
      source: "manual",
    });

    // Đăng lên Threads (tự chọn flow theo mediaType)
    const threadsPostId = await postMediaToThreads({
      text: content,
      mediaType: mediaType || "TEXT",
      imageUrl,
      videoUrl,
    });

    // Cập nhật thành công
    upsertPost({
      id: postId,
      content,
      topic: topic || "marketing",
      scheduledAt: now,
      postedAt: new Date().toISOString(),
      threadsPostId,
      status: "posted",
      topicLabel,
      mediaType: mediaType || "TEXT",
      imageUrl,
      source: "manual",
    });

    return NextResponse.json({
      success: true,
      data: {
        postId,
        threadsPostId,
        postedAt: new Date().toISOString(),
        mediaType: mediaType || "TEXT",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
