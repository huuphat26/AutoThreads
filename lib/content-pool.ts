// ============================================================
// AUTO THREADS — Content Pool Store
// Lưu trữ nội dung đã soạn sẵn từ file Excel.
// Scheduler sẽ dùng pool trước khi fallback sang AI generate.
// File: data/content-pool.json
// ============================================================

import fs from "fs";
import path from "path";
import type {
  ContentPoolItem,
  ContentPoolStore,
  AutoPostSlot,
} from "@/types";

const POOL_FILE = path.join(process.cwd(), "data", "content-pool.json");

// ─── Helpers ──────────────────────────────────────────────────

export function readPool(): ContentPoolStore {
  try {
    if (!fs.existsSync(POOL_FILE)) {
      return { items: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(POOL_FILE, "utf-8");
    return JSON.parse(raw) as ContentPoolStore;
  } catch {
    return { items: [], lastUpdated: new Date().toISOString() };
  }
}

function writePool(store: ContentPoolStore): void {
  store.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(POOL_FILE), { recursive: true });
  fs.writeFileSync(POOL_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function generatePoolId(): string {
  return `pool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Public API ───────────────────────────────────────────────

/** Lấy item đang pending cho ngày + slot cụ thể.
 *  Nếu không có item đúng ngày → fallback sang item pending gần nhất cùng slot. */
export function getPoolItemForSlot(
  date: string,
  slot: AutoPostSlot,
): ContentPoolItem | null {
  const store = readPool();
  const exact = store.items.find(
    (item) =>
      item.date === date && item.slot === slot && item.status === "pending",
  );
  if (exact) return exact;

  // Fallback: oldest pending item for the same slot (any date)
  const pending = store.items
    .filter((item) => item.slot === slot && item.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date));
  return pending[0] ?? null;
}

/** Đánh dấu đã dùng và link với AutoPostRecord */
export function markPoolItemUsed(id: string, recordId: string): void {
  const store = readPool();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    store.items[idx].status = "used";
    store.items[idx].usedAt = new Date().toISOString();
    store.items[idx].recordId = recordId;
  }
  writePool(store);
}

/**
 * Import danh sách item vào pool.
 * Nếu date+slot đã tồn tại và vẫn "pending" → ghi đè.
 * Nếu date+slot đã "used"/"skipped" → bỏ qua.
 */
export function importPoolItems(
  items: Omit<ContentPoolItem, "id" | "importedAt">[],
): {
  added: number;
  updated: number;
  skipped: number;
} {
  const store = readPool();
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const item of items) {
    const existingIdx = store.items.findIndex(
      (i) => i.date === item.date && i.slot === item.slot,
    );

    if (existingIdx >= 0) {
      const existing = store.items[existingIdx];
      if (existing.status === "pending") {
        store.items[existingIdx] = {
          ...item,
          id: existing.id,
          importedAt: now,
        };
        updated++;
      } else {
        skipped++;
      }
    } else {
      store.items.push({
        ...item,
        id: `pool_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        importedAt: now,
      });
      added++;
    }
  }

  // Sắp xếp theo ngày → slot (morning → noon → evening)
  const SLOT_ORDER: Record<string, number> = {
    morning: 0,
    noon: 1,
    evening: 2,
  };
  store.items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (SLOT_ORDER[a.slot] ?? 1) - (SLOT_ORDER[b.slot] ?? 1);
  });

  writePool(store);
  return { added, updated, skipped };
}

/** Thống kê pool */
export function getPoolStats() {
  const store = readPool();
  const total = store.items.length;
  const pending = store.items.filter((i) => i.status === "pending").length;
  const used = store.items.filter((i) => i.status === "used").length;
  const skipped = store.items.filter((i) => i.status === "skipped").length;
  return { total, pending, used, skipped, lastUpdated: store.lastUpdated };
}

/** Lấy tất cả items (dùng cho API) */
export function getAllPoolItems(): ContentPoolItem[] {
  return readPool().items;
}

/** Xoá một item theo id */
export function deletePoolItem(id: string): boolean {
  const store = readPool();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  store.items.splice(idx, 1);
  writePool(store);
  return true;
}

/** Cập nhật igImageUrl cho một pool item */
export function updatePoolItemImageUrl(
  id: string,
  igImageUrl: string,
): boolean {
  const store = readPool();
  const idx = store.items.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  store.items[idx].igImageUrl = igImageUrl;
  writePool(store);
  return true;
}

/** Trả về pool item đã liên kết với AutoPostRecord id (sau khi startWaitingForAI chạy) */
export function getPoolItemByRecordId(
  recordId: string,
): ContentPoolItem | null {
  const store = readPool();
  return store.items.find((i) => i.recordId === recordId) ?? null;
}

/** Xoá tất cả items pending (giữ lại đã used) */
export function clearPendingItems(): number {
  const store = readPool();
  const before = store.items.length;
  store.items = store.items.filter((i) => i.status !== "pending");
  writePool(store);
  return before - store.items.length;
}
