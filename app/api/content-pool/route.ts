import { NextRequest, NextResponse } from "next/server";
import {
  getAllPoolItems,
  getPoolStats,
  deletePoolItem,
  clearPendingItems,
} from "@/lib/content-pool";
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
