import { NextRequest, NextResponse } from "next/server";
import {
  getAllPoolItems,
  getPoolStats,
  deletePoolItem,
  clearPendingItems,
  updatePoolItemImageUrl,
  getPoolItemByRecordId,
} from "@/lib/content-pool";
import { getAutoRecord, upsertAutoRecord } from "@/lib/auto-post-store";
import { ContentPoolStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") as ContentPoolStatus | null;

  const stats = getPoolStats();
  let items = getAllPoolItems();

  if (statusFilter) {
    items = items.filter((item) => item.status === statusFilter);
  }

  return NextResponse.json({ success: true, data: { stats, items } });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, igImageUrl } = body as { id?: string; igImageUrl?: string };
    if (!id || !igImageUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu id hoặc igImageUrl" },
        { status: 400 },
      );
    }
    const ok = updatePoolItemImageUrl(id, igImageUrl);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy item" },
        { status: 404 },
      );
    }

    // ── Propagate đến AutoPostRecord nếu item đã được dùng (startWaitingForAI đã chạy) ──
    // Tìm pool item vừa cập nhật để lấy recordId
    const allItems = getAllPoolItems();
    const poolItem = allItems.find((i) => i.id === id);
    if (poolItem?.recordId) {
      const record = getAutoRecord(poolItem.recordId);
      if (record && record.overallStatus === "content_ready") {
        // Cập nhật igImageUrl vào record trước khi đăng
        upsertAutoRecord({ ...record, igImageUrl });
        console.log(
          `[ContentPool] ✅ Propagated igImageUrl → AutoPostRecord ${poolItem.recordId}`,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clearAll = searchParams.get("clearAll");

  if (clearAll === "pending") {
    const count = clearPendingItems();
    return NextResponse.json({ success: true, data: { deleted: count } });
  }

  if (id) {
    deletePoolItem(id);
    return NextResponse.json({ success: true, data: { deleted: 1 } });
  }

  return NextResponse.json(
    { success: false, error: "Thiếu tham số: cần ?id= hoặc ?clearAll=pending" },
    { status: 400 },
  );
}
