// ============================================================
// GET    /api/platforms/instagram/schedule  — Danh sách bài hẹn giờ & lịch sử
// POST   /api/platforms/instagram/schedule  — Tạo bài mới (đăng ngay hoặc hẹn giờ)
// DELETE /api/platforms/instagram/schedule?id=xxx — Hủy bài hẹn
//
// Lưu ý: Instagram KHÔNG hỗ trợ text-only. Bắt buộc imageUrl hoặc videoUrl.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  readIGHistory,
  getIGStats,
  upsertIGPost,
} from "@/lib/services/ig-store";
import { postIGNow, scheduleIGPost } from "@/lib/services/ig-scheduler";
import { generateContent } from "@/lib/content-generator";
import type { IGScheduleMediaType } from "@/types";

// ─── GET — danh sách bài đăng ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  try {
    const history = readIGHistory();
    const posts = status
      ? history.posts.filter((p) => p.status === status).slice(0, limit)
      : history.posts.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: { posts, stats: getIGStats(), lastUpdated: history.lastUpdated },
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
  try {
    const body = await req.json();

    const {
      caption, // Nội dung / caption
      mediaType = "IMAGE" as IGScheduleMediaType,
      imageUrl, // Bắt buộc khi mediaType === "IMAGE"
      videoUrl, // Bắt buộc khi mediaType === "REELS"
      shareToFeed, // Chia sẻ Reels lên Feed
      scheduledAt, // ISO string — nếu không truyền → đăng ngay
      useAI = false, // true → tạo caption bằng AI
      topic,
      keywords,
      accountId, // ID tài khoản đăng bài (multi-account)
    } = body as {
      caption?: string;
      mediaType?: IGScheduleMediaType;
      imageUrl?: string;
      videoUrl?: string;
      shareToFeed?: boolean;
      scheduledAt?: string;
      useAI?: boolean;
      topic?: string;
      keywords?: string[];
      accountId?: string;
    };

    // Validate media URL
    if (mediaType === "IMAGE" && !imageUrl?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram yêu cầu imageUrl khi mediaType là IMAGE",
        },
        { status: 400 },
      );
    }
    if (mediaType === "REELS" && !videoUrl?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Instagram yêu cầu videoUrl khi mediaType là REELS",
        },
        { status: 400 },
      );
    }

    // ── Tạo caption bằng AI nếu yêu cầu ──────────────────────────────────────
    let finalCaption = caption?.trim() ?? "";
    let topicLabel: string | undefined;

    if (useAI || !finalCaption) {
      const generated = await generateContent({
        topic: topic || undefined,
        keywords: keywords || [],
      });
      finalCaption = generated.fullPost;
      topicLabel = generated.topicLabel;
    }

    // ── Đăng ngay hay hẹn giờ ─────────────────────────────────────────────────
    const isScheduled =
      scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 10_000;

    if (isScheduled) {
      const post = scheduleIGPost({
        caption: finalCaption,
        mediaType,
        imageUrl,
        videoUrl,
        shareToFeed,
        scheduledAt,
        topic,
        topicLabel,
      });
      return NextResponse.json({ success: true, data: post });
    } else {
      const post = await postIGNow({
        caption: finalCaption,
        mediaType,
        imageUrl,
        videoUrl,
        shareToFeed,
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
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Thiếu tham số id" },
      { status: 400 },
    );
  }

  try {
    const history = readIGHistory();
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

    upsertIGPost({ ...post, status: "cancelled" });
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
