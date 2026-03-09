// ============================================================
// API Route: /api/auto-scheduler
// Quản lý Multi-Platform Auto Scheduler (AI 12:00 & 18:00)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import {
  getAutoSchedulerStatus,
  triggerAutoPost,
  executePlatformPosts,
  scheduleOnceForToday,
  startAutoScheduler,
  stopAutoScheduler,
  storeContentForRecord,
} from "@/lib/services/auto-scheduler";
import { getAllAutoRecords } from "@/lib/auto-post-store";
import { getIGImagePool } from "@/lib/ig-image-pool";
import type { AutoPostSlot } from "@/types";

// ── GET: Trạng thái + lịch sử ───────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const view = searchParams.get("view");

  if (view === "history") {
    const records = getAllAutoRecords();
    const todayOnly = searchParams.get("today") === "true";
    if (todayOnly) {
      const todayKey = new Date().toLocaleDateString("sv", {
        timeZone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh",
      });
      const todayRecords = records.filter(
        (r) =>
          new Date(r.triggeredAt).toLocaleDateString("sv", {
            timeZone: process.env.TIMEZONE || "Asia/Ho_Chi_Minh",
          }) === todayKey,
      );
      return NextResponse.json({ success: true, data: todayRecords });
    }
    return NextResponse.json({ success: true, data: records });
  }

  if (view === "image-pool") {
    const pool = getIGImagePool();
    return NextResponse.json({ success: true, data: pool });
  }

  const status = getAutoSchedulerStatus();
  return NextResponse.json({ success: true, data: status });
}

// ── POST: Trigger thủ công ────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // ── Retry-slot: gọi từ UI khi slot bị "Bỏ qua" — không cần cron-secret ──
  if (body.action === "retry-slot") {
    const slot: AutoPostSlot =
      body.slot === "morning"
        ? "morning"
        : body.slot === "evening"
          ? "evening"
          : "lunch";
    const platforms: Array<"facebook" | "threads" | "instagram"> | undefined =
      Array.isArray(body.platforms) ? body.platforms : undefined;
    triggerAutoPost(slot, platforms).catch((err) => {
      console.error("[AutoScheduler API] Retry-slot lỗi:", err);
    });
    return NextResponse.json({
      success: true,
      data: { message: `Đang retry slot [${slot}]…` },
    });
  }

  // ── Dismiss-slot: bỏ qua slot lỗi — đánh dấu "dismissed" ──
  if (body.action === "dismiss-slot") {
    const recordId: string | undefined =
      typeof body.recordId === "string" ? body.recordId : undefined;
    if (recordId) {
      const { getAutoRecord, upsertAutoRecord } =
        await import("@/lib/auto-post-store");
      const rec = getAutoRecord(recordId);
      if (
        rec &&
        (rec.overallStatus === "failed" || rec.overallStatus === "partial")
      ) {
        upsertAutoRecord({ ...rec, overallStatus: "dismissed" });
      }
    }
    return NextResponse.json({
      success: true,
      data: { message: "Đã bỏ qua slot này." },
    });
  }

  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const slot: AutoPostSlot =
      body.slot === "morning"
        ? "morning"
        : body.slot === "evening"
          ? "evening"
          : "lunch";

    const platforms: Array<"facebook" | "threads" | "instagram"> | undefined =
      Array.isArray(body.platforms) ? body.platforms : undefined;

    const recordId: string | undefined =
      typeof body.recordId === "string" ? body.recordId : undefined;

    // Re-run posting for an existing record (e.g., sau khi bị lỗi)
    if (recordId) {
      executePlatformPosts(recordId, platforms, true).catch((err) => {
        console.error("[AutoScheduler API] Re-run lỗi:", err);
      });
      const platformsLabel = platforms
        ? platforms.join(",")
        : "tất cả nền tảng";
      return NextResponse.json({
        success: true,
        data: {
          message: `Đang re-run posting cho record ${recordId} — đăng lên ${platformsLabel}`,
        },
      });
    }

    // Chạy bất đồng bộ — trả về ngay để tránh timeout 30s của serverless
    triggerAutoPost(slot, platforms).catch((err) => {
      console.error("[AutoScheduler API] Trigger lỗi:", err);
    });

    const platformsLabel = platforms ? platforms.join(",") : "FB→Threads→IG";
    return NextResponse.json({
      success: true,
      data: {
        message: `Đã kích hoạt auto-post [${slot}] — đăng ${platformsLabel} trong vài phút`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── PATCH: Điều khiển scheduler ──────────────────────────────
export async function PATCH(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const action: "start" | "stop" | "schedule-once" = body.action;

    if (action === "schedule-once") {
      const slot: AutoPostSlot =
        body.slot === "morning"
          ? "morning"
          : body.slot === "evening"
            ? "evening"
            : "lunch";
      const prepTime: string = body.prepTime;
      const postTime: string = body.postTime;
      const platforms: Array<"facebook" | "threads" | "instagram"> | undefined =
        Array.isArray(body.platforms) ? body.platforms : undefined;

      if (!prepTime || !postTime) {
        return NextResponse.json(
          {
            success: false,
            error: "Thiếu prepTime hoặc postTime (VD: '18:00')",
          },
          { status: 400 },
        );
      }

      const { prepAt, postAt } = scheduleOnceForToday(
        slot,
        prepTime,
        postTime,
        platforms,
      );
      const platformsLabel = platforms ? platforms.join(",") : "FB→Threads→IG";
      return NextResponse.json({
        success: true,
        data: {
          message: `Đã lên lịch one-time [${slot}]: chuẩn bị ${prepTime} VN → đăng ${postTime} VN (${platformsLabel})`,
          prepAt: prepAt.toISOString(),
          postAt: postAt.toISOString(),
        },
      });
    }

    if (action === "start") {
      startAutoScheduler();
    } else if (action === "stop") {
      stopAutoScheduler();
    } else {
      return NextResponse.json(
        { success: false, error: "action phải là 'start' hoặc 'stop'" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: getAutoSchedulerStatus() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── PUT: Browser gửi nội dung AI đã soạn — lưu vào record (không đăng ngay) ─
// Body: { recordId, fbContent, threadsContent, igCaption, topicLabel? }
// Nội dung được lưu với status "content_ready".
// Cron 12:00/18:00 sẽ tự động đăng theo thứ tự FB→Threads→IG.
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, fbContent, threadsContent, igCaption, topicLabel } =
      body as {
        recordId: string;
        fbContent: string;
        threadsContent: string;
        igCaption: string;
        topicLabel?: string;
      };

    if (!recordId || !fbContent?.trim()) {
      return NextResponse.json(
        { success: false, error: "Thiếu recordId hoặc fbContent" },
        { status: 400 },
      );
    }

    // Lưu content vào record — trả về ngay, tránh timeout serverless
    // storeContentForRecord tự kiểm tra nếu đã qua giờ đăng → trigger ngay
    try {
      storeContentForRecord(
        recordId,
        fbContent.trim(),
        (threadsContent ?? fbContent).trim().slice(0, 480),
        (igCaption ?? fbContent).trim().slice(0, 300),
        topicLabel ?? "",
      );
    } catch (err) {
      console.error("[AutoScheduler API] storeContentForRecord lỗi:", err);
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        message:
          "Đã lưu nội dung (content_ready). Sẽ đăng FB 12:00 → Threads 12:03 → IG 12:06",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
