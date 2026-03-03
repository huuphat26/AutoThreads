// ============================================================
// API Route: /api/auto-scheduler
// Quản lý Multi-Platform Auto Scheduler (AI 12:00 & 18:00)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import {
  getAutoSchedulerStatus,
  triggerAutoPost,
  startAutoScheduler,
  stopAutoScheduler,
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
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slot: AutoPostSlot = body.slot === "evening" ? "evening" : "noon";

    // Chạy bất đồng bộ — trả về ngay để tránh timeout 30s của serverless
    triggerAutoPost(slot).catch((err) => {
      console.error("[AutoScheduler API] Trigger lỗi:", err);
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Đã kích hoạt auto-post [${slot}] — đăng tuần tự FB→Threads→IG trong ~4 phút`,
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
    const action: "start" | "stop" = body.action;

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
