// ============================================================
// GET  /api/platforms/facebook/schedule  — Danh sách bài hẹn giờ & lịch sử
// POST /api/platforms/facebook/schedule  — Tạo bài mới (đăng ngay hoặc hẹn giờ)
// DELETE /api/platforms/facebook/schedule?id=xxx — Hủy bài hẹn
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { readFBHistory, upsertFBPost } from "@/lib/services/fb-store";
import { postFBNow, scheduleFBPost } from "@/lib/services/fb-scheduler";
import { generateContent } from "@/lib/content-generator";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import type { FBMediaType } from "@/types";

// ─── GET — danh sách bài đăng ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status"); // optional filter
  const accountId = searchParams.get("accountId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  try {
    const history = readFBHistory();
    const accountPosts = accountId
      ? history.posts.filter(
          (p) => (p.accountId ?? "env-default") === accountId,
        )
      : history.posts;
    const posts = status
      ? accountPosts.filter((p) => p.status === status).slice(0, limit)
      : accountPosts.slice(0, limit);
    const stats = {
      total: accountPosts.length,
      scheduled: accountPosts.filter((p) => p.status === "scheduled").length,
      posted: accountPosts.filter((p) => p.status === "posted").length,
      failed: accountPosts.filter((p) => p.status === "failed").length,
      pending: accountPosts.filter((p) => p.status === "pending").length,
      cancelled: accountPosts.filter((p) => p.status === "cancelled").length,
    };

    return NextResponse.json({
      success: true,
      data: { posts, stats, lastUpdated: history.lastUpdated },
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
      message, // Nội dung bài đăng (bắt buộc nếu không dùng AI)
      mediaType = "TEXT" as FBMediaType,
      imageUrl,
      scheduledAt, // ISO string — nếu truyền → hẹn giờ; không truyền → đăng ngay
      useAI = false, // true → tạo nội dung bằng AI
      topic,
      keywords,
      accountId, // ID tài khoản đăng bài (multi-account)
    } = body as {
      message?: string;
      mediaType?: FBMediaType;
      imageUrl?: string;
      scheduledAt?: string;
      useAI?: boolean;
      topic?: string;
      keywords?: string[];
      accountId?: string;
    };

    // ── Tạo nội dung bằng AI nếu yêu cầu ──────────────────────────────────────
    let finalMessage = message?.trim() ?? "";
    let topicLabel: string | undefined;

    if (useAI || !finalMessage) {
      const generated = await generateContent({
        topic: topic || undefined,
        keywords: keywords || [],
      });
      finalMessage = generated.fullPost;
      topicLabel = generated.topicLabel;
    }

    if (!finalMessage) {
      return NextResponse.json(
        { success: false, error: "Nội dung bài đăng không được để trống" },
        { status: 400 },
      );
    }

    // ── Xác định đây là đăng ngay hay hẹn giờ ─────────────────────────────────
    const isScheduled =
      scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 10_000;

    if (isScheduled) {
      // Hẹn giờ
      const post = scheduleFBPost({
        message: finalMessage,
        mediaType,
        imageUrl,
        scheduledAt,
        topic,
        topicLabel,
        accountId,
      });
      return NextResponse.json({ success: true, data: post });
    } else {
      // Đăng ngay
      const post = await postFBNow({
        message: finalMessage,
        mediaType,
        imageUrl,
        topic,
        topicLabel,
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
      { success: false, error: "Thiếu tham số id" },
      { status: 400 },
    );
  }

  try {
    const history = readFBHistory();
    const post = history.posts.find((p) => p.id === id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy bài đăng" },
        { status: 404 },
      );
    }

    if (post.status === "posted") {
      return NextResponse.json(
        { success: false, error: "Không thể hủy bài đã đăng" },
        { status: 400 },
      );
    }

    // Đánh dấu là cancelled thay vì xóa để giữ lịch sử
    upsertFBPost({ ...post, status: "cancelled" });

    return NextResponse.json({ success: true });
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
