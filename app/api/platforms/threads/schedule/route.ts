// ============================================================
// GET    /api/platforms/threads/schedule  — Danh sách bài hẹn giờ & lịch sử
// POST   /api/platforms/threads/schedule  — Tạo bài mới (đăng ngay hoặc hẹn giờ)
// DELETE /api/platforms/threads/schedule?id=xxx — Hủy bài hẹn
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  readThreadsManualHistory,
  getThreadsManualStats,
  upsertThreadsManualPost,
} from "@/lib/services/threads-manual-store";
import {
  postThreadsManualNow,
  scheduleThreadsManualPost,
} from "@/lib/services/threads-manual-scheduler";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import type { ThreadsManualMediaType } from "@/types";

// ─── GET — danh sách bài đăng ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status"); // optional filter
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  try {
    const history = readThreadsManualHistory();
    const posts = status
      ? history.posts.filter((p) => p.status === status).slice(0, limit)
      : history.posts.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        posts,
        stats: getThreadsManualStats(),
        lastUpdated: history.lastUpdated,
      },
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

// ─── POST — tạo bài mới ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();

    const {
      content, // Nội dung / caption bài đăng
      mediaType = "TEXT" as ThreadsManualMediaType,
      imageUrl,
      topicTag, // topic tag (tùy chọn, 1-50 ký tự, không có dấu . và &)
      scheduledAt, // ISO string — nếu truyền → hẹn giờ; không truyền → đăng ngay
      accountId, // ID tài khoản đăng bài (multi-account)
    } = body as {
      content?: string;
      mediaType?: ThreadsManualMediaType;
      imageUrl?: string;
      topicTag?: string;
      scheduledAt?: string;
      accountId?: string;
    };

    // Validate topicTag
    const cleanTopicTag = topicTag?.trim().replace(/^#/, "") || undefined;
    if (cleanTopicTag) {
      if (cleanTopicTag.length > 50) {
        return NextResponse.json(
          { success: false, error: "Topic tag không được dài quá 50 ký tự" },
          { status: 400 },
        );
      }
      if (/[.&]/.test(cleanTopicTag)) {
        return NextResponse.json(
          {
            success: false,
            error: "Topic tag không được chứa dấu chấm (.) hoặc dấu & ",
          },
          { status: 400 },
        );
      }
    }

    const finalContent = content?.trim() ?? "";

    // Bắt buộc có nội dung trừ khi là IMAGE (caption tùy chọn)
    if (mediaType === "TEXT" && !finalContent) {
      return NextResponse.json(
        { success: false, error: "Nội dung bài đăng không được để trống" },
        { status: 400 },
      );
    }

    if (mediaType === "IMAGE" && !imageUrl?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Vui lòng cung cấp URL hình ảnh khi loại bài là IMAGE",
        },
        { status: 400 },
      );
    }

    // ── Xác định đây là đăng ngay hay hẹn giờ ─────────────────────────────────
    const isScheduled =
      scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 10_000;

    if (isScheduled) {
      // Hẹn giờ
      const post = scheduleThreadsManualPost({
        content: finalContent,
        mediaType,
        imageUrl: imageUrl?.trim(),
        topicTag: cleanTopicTag,
        scheduledAt,
      });
      return NextResponse.json({ success: true, data: post });
    } else {
      // Đăng ngay
      const post = await postThreadsManualNow({
        content: finalContent,
        mediaType,
        imageUrl: imageUrl?.trim(),
        topicTag: cleanTopicTag,
        accountId,
      });
      return NextResponse.json({
        success: post.status === "posted",
        data: post,
        error: post.status !== "posted" ? post.errorMessage : undefined,
      });
    }
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

// ─── DELETE — hủy bài hẹn giờ ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Thiếu tham số 'id'" },
      { status: 400 },
    );
  }

  try {
    const history = readThreadsManualHistory();
    const post = history.posts.find((p) => p.id === id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy bài đăng" },
        { status: 404 },
      );
    }

    if (post.status !== "scheduled" && post.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Không thể hủy bài ở trạng thái '${post.status}'`,
        },
        { status: 400 },
      );
    }

    upsertThreadsManualPost({ ...post, status: "cancelled" });

    return NextResponse.json({
      success: true,
      data: { id, status: "cancelled" },
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
