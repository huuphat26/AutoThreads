// ============================================
// API Route: /api/scheduler - Quản lý Scheduler
// ============================================
import { NextRequest, NextResponse } from "next/server";
import {
  getSchedulerStatus,
  startScheduler,
  triggerManualPost,
} from "@/lib/scheduler";
import type { PostSlot } from "@/types";

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
    const body = await req.json();
    const slot: PostSlot = body.slot || "morning";

    // Kiểm tra secret để chỉ chủ nhân mới dùng được
    const secret = req.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Không có quyền truy cập" },
        { status: 401 },
      );
    }

    const result = await triggerManualPost(slot);
    return NextResponse.json({ success: true, data: { message: result } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
