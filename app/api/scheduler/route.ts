// ============================================
// API Route: /api/scheduler - Quản lý Scheduler
// ============================================
import { NextRequest, NextResponse } from "next/server";
import {
  getSchedulerStatus,
  startScheduler,
  triggerManualPost,
  pauseScheduler,
  resumeScheduler,
} from "@/lib/scheduler";

// GET: Lấy trạng thái scheduler (tự động start nếu chưa chạy)
export async function GET() {
  // Đảm bảo scheduler luôn được khởi động
  startScheduler();
  const status = getSchedulerStatus();
  return NextResponse.json({ success: true, data: status });
}

// POST: Kích hoạt đăng bài thủ công (để test)
export async function POST(req: NextRequest) {
  try {
    // Kiểm tra secret để chỉ chủ nhân mới dùng được
    const secret = req.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const result = await triggerManualPost();
    return NextResponse.json({ success: true, data: { message: result } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// PATCH: Tạm dừng hoặc tiếp tục scheduler
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const action: "pause" | "resume" = body.action;

    if (action === "pause") {
      pauseScheduler();
    } else if (action === "resume") {
      resumeScheduler();
    } else {
      return NextResponse.json(
        { success: false, error: "action phải là 'pause' hoặc 'resume'" },
        { status: 400 },
      );
    }

    const status = getSchedulerStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
