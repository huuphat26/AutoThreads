// ============================================================
// API Route: /api/threads/container/[containerId]
// Kiểm tra trạng thái media container (FINISHED / IN_PROGRESS / ERROR)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { threadsService } from "@/lib/services/threads.service";

type Params = { params: Promise<{ containerId: string }> };

// GET /api/threads/container/:containerId
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { containerId } = await params;

    if (!containerId) {
      return NextResponse.json(
        { success: false, error: "Thiếu containerId" },
        { status: 400 },
      );
    }

    const status = await threadsService.getContainerStatus(containerId);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        isReady: status.status === "FINISHED",
        isFailed: status.status === "ERROR" || status.status === "EXPIRED",
        label:
          {
            FINISHED: "✅ Sẵn sàng publish",
            IN_PROGRESS: "⏳ Đang xử lý",
            ERROR: "❌ Lỗi",
            EXPIRED: "⌛ Đã hết hạn",
            PUBLISHED: "📬 Đã đăng",
          }[status.status] ?? status.status,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
