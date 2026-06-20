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
  hotfixRecordImage,
} from "@/lib/services/auto-scheduler";
import { getAllAutoRecords } from "@/lib/auto-post-store";
import { getIGImagePool } from "@/lib/ig-image-pool";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import type { AutoPostSlot } from "@/types";
import { initAllStores } from "@/lib/services/store-initializer";

type AutoSchedulerAction = "retry-slot" | "dismiss-slot" | "hotfix-image";
type AutoSchedulerPlatform = "facebook" | "threads" | "instagram";

const VALID_SLOTS = new Set<AutoPostSlot>(["evening"]);
const VALID_PLATFORMS = new Set<AutoSchedulerPlatform>([
  "facebook",
  "threads",
  "instagram",
]);

function parseSlot(value: unknown): AutoPostSlot | null {
  if (typeof value !== "string") return null;
  return VALID_SLOTS.has(value as AutoPostSlot)
    ? (value as AutoPostSlot)
    : null;
}

function parsePlatforms(value: unknown): AutoSchedulerPlatform[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const parsed: AutoSchedulerPlatform[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    if (!VALID_PLATFORMS.has(item as AutoSchedulerPlatform)) return null;
    parsed.push(item as AutoSchedulerPlatform);
  }
  return parsed;
}

// ── GET: Trạng thái + lịch sử ───────────────────────────────────
export async function GET(req: NextRequest) {
  await initAllStores();
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

  if (view === "preview-pool") {
    const { getPoolItemForSlot } = await import("@/lib/content-pool");
    const { getTodayVNDate } = await import("@/lib/services/auto-scheduler");
    const today = getTodayVNDate();
    const item = getPoolItemForSlot(today, "evening", undefined, undefined, false);
    return NextResponse.json({ success: true, data: item });
  }

  const status = getAutoSchedulerStatus();
  return NextResponse.json({ success: true, data: status });
}

// ── POST: Trigger thủ công ────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  await initAllStores();
  const rawBody: unknown = await req.json().catch(() => null);
  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json(
      { success: false, error: "Body JSON không hợp lệ" },
      { status: 400 },
    );
  }

  const body = rawBody as Record<string, unknown>;
  const action =
    body.action === "retry-slot" ||
    body.action === "dismiss-slot" ||
    body.action === "hotfix-image"
      ? (body.action as AutoSchedulerAction)
      : undefined;

  const parsedSlot = parseSlot(body.slot);
  if (body.slot !== undefined && !parsedSlot) {
    return NextResponse.json(
      {
        success: false,
        error: "slot không hợp lệ (evening)",
      },
      { status: 400 },
    );
  }

  const parsedPlatforms = parsePlatforms(body.platforms);
  if (parsedPlatforms === null) {
    return NextResponse.json(
      {
        success: false,
        error: "platforms phải là mảng gồm facebook | threads | instagram",
      },
      { status: 400 },
    );
  }

  const slot = parsedSlot ?? "evening";
  const platforms = parsedPlatforms.length > 0 ? parsedPlatforms : undefined;

  // ── Retry-slot: gọi từ UI khi slot bị "Bỏ qua" ──
  if (action === "retry-slot") {
    triggerAutoPost(slot, platforms).catch((err) => {
      console.error("[AutoScheduler API] Retry-slot lỗi:", err);
    });
    return NextResponse.json({
      success: true,
      data: { message: `Đang retry slot [${slot}]…` },
    });
  }

  // ── Dismiss-slot: bỏ qua slot lỗi — đánh dấu "dismissed" ──
  if (action === "dismiss-slot") {
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

  // ── Hotfix-image: thay đổi ảnh cho record hoặc pool item ──
  if (action === "hotfix-image") {
    const recordId = typeof body.recordId === "string" ? body.recordId : undefined;
    const poolId = typeof body.poolId === "string" ? body.poolId : undefined;
    const newImageUrl =
      typeof body.newImageUrl === "string" ? body.newImageUrl : undefined;

    if (!newImageUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu newImageUrl" },
        { status: 400 },
      );
    }

    if (!recordId && !poolId) {
      return NextResponse.json(
        { success: false, error: "Thiếu recordId hoặc poolId" },
        { status: 400 },
      );
    }

    try {
      let finalUrl = newImageUrl;
      const {
        validateImageUrl,
        isCloudinaryUrl,
        uploadImageUrlToCloudinary,
      } = await import("@/lib/services/cloudinary-server");

      // 1. Validate & Upload
      const isValid = await validateImageUrl(newImageUrl);
      if (!isValid) throw new Error("URL ảnh không hợp lệ.");

      if (!isCloudinaryUrl(newImageUrl)) {
        finalUrl = await uploadImageUrlToCloudinary(newImageUrl);
      }

      // 2. Update Data
      if (recordId) {
        await hotfixRecordImage(recordId, finalUrl);
      } else if (poolId) {
        const { updatePoolItemImageUrl } = await import("@/lib/content-pool");
        const success = updatePoolItemImageUrl(poolId, finalUrl);
        if (!success) throw new Error("Không tìm thấy item trong pool.");
      }

      return NextResponse.json({
        success: true,
        data: {
          message: "Đã cập nhật ảnh thành công.",
          cloudinaryUrl: finalUrl,
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
  }

  try {
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
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    await initAllStores();
    const body = await req.json();
    const action: "start" | "stop" | "schedule-once" = body.action;

    if (action === "schedule-once") {
      const slot: AutoPostSlot =
        body.slot === "evening"
          ? "evening"
          : "evening";
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
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    await initAllStores();
    const body = await req.json();
    const {
      recordId,
      fbContent,
      threadsContent,
      igCaption,
      topicLabel,
      igImageUrl,
    } = body as {
      recordId: string;
      fbContent: string;
      threadsContent: string;
      igCaption: string;
      topicLabel?: string;
      igImageUrl?: string;
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
        igImageUrl,
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
          "Đã lưu nội dung (content_ready). Sẽ đăng FB 20:00 → Threads +5phút → IG +10phút",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
