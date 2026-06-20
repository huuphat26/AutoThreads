// ============================================================
// API: /api/accounts — Quản lý tài khoản đăng bài
// GET              → Danh sách accounts (auto-detected từ .env)
// PATCH            → Cập nhật metadata (name, niche, color, note)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getAllAccountsSafe, updateAccount, toSafe } from "@/lib/account-store";
import { readPool } from "@/lib/content-pool";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import { initAllStores } from "@/lib/services/store-initializer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// ── GET ────────────────────────────────────────────────────────
export async function GET() {
  await initAllStores();
  const accounts = getAllAccountsSafe();

  // Đính kèm pendingCount cho mỗi account
  const pool = readPool();
  const withCounts = accounts.map((acc) => {
    const pending = pool.items.filter(
      (item) =>
        item.status === "pending" &&
        (item.accountId ?? "env-default") === acc.id,
    ).length;
    return { ...acc, pendingCount: pending };
  });

  return json({ success: true, data: withCounts });
}

// ── PATCH — Cập nhật metadata account ─────────────────────────
export async function PATCH(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return json({ success: false, error: "Không có quyền truy cập" }, 401);
  }

  try {
    await initAllStores();
    const body = await req.json();
    const { id, ...data } = body;

    if (!id || typeof id !== "string") {
      return json({ success: false, error: "Thiếu id" }, 400);
    }

    const updated = updateAccount(id, data);
    if (!updated) {
      return json({ success: false, error: "Account không tồn tại" }, 404);
    }

    return json({ success: true, data: toSafe(updated) });
  } catch (err) {
    return json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Lỗi cập nhật",
      },
      500,
    );
  }
}
