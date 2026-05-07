// ============================================================
// AUTO THREADS — Content Pool Store
// Lưu trữ nội dung đã soạn sẵn từ file Excel.
// Scheduler sẽ dùng pool trước khi fallback sang AI generate.
// File: data/content-pool.json
// ============================================================

import fs from "fs";
import path from "path";
import type { ContentPoolItem, ContentPoolStore, AutoPostSlot } from "@/types";

const POOL_FILE = path.join(process.cwd(), "data", "content-pool.json");

const isVercel = process.env.VERCEL === "1";

async function syncToKV(store: ContentPoolStore): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set("content-pool", store);
  } catch (e) {
    console.error("[KV] Failed to sync content-pool:", e);
  }
}

function kvSyncFireAndForget(store: ContentPoolStore): void {
  if (!isVercel) return;
  syncToKV(store).catch((e) => console.error("[KV] Sync error:", e));
}

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
  kvSyncFireAndForget(store);
}

export async function initContentPoolFromKV(): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    const store = await kv.get<ContentPoolStore>("content-pool");
    if (store) {
      fs.mkdirSync(path.dirname(POOL_FILE), { recursive: true });
      fs.writeFileSync(POOL_FILE, JSON.stringify(store, null, 2), "utf-8");
      console.log("[KV] Loaded content-pool from KV");
    }
  } catch (e) {
    console.error("[KV] Failed to load content-pool:", e);
  }
}

export function generatePoolId(): string {
  return `pool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeAccountId(accountId?: string): string {
  return accountId ?? "env-default";
}

/**
 * Dry-run import impact without mutating store.
 * Dùng để preview wizard import trên UI.
 */
export function previewPoolImport(
  items: Omit<ContentPoolItem, "id" | "importedAt">[],
): {
  added: number;
  updated: number;
  skipped: number;
} {
  const store = readPool();
  const simulated = [...store.items];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const itemAccountId = normalizeAccountId(item.accountId);
    const existingIdx = simulated.findIndex(
      (i) =>
        i.date === item.date &&
        i.slot === item.slot &&
        normalizeAccountId(i.accountId) === itemAccountId,
    );

    if (existingIdx >= 0) {
      if (simulated[existingIdx].status === "pending") {
        simulated[existingIdx] = {
          ...simulated[existingIdx],
          ...item,
        };
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    simulated.push({
      ...item,
      id: "preview",
      importedAt: "preview",
    });
    added++;
  }

  return { added, updated, skipped };
}

// ─── Public API ───────────────────────────────────────────────

/** Lấy item đang pending cho ngày + slot cụ thể.
 *  Nếu không có item đúng ngày → fallback sang item pending gần nhất cùng slot.
 *  Nếu accountId được truyền → chỉ lấy item của account đó.
 *  Nếu contentSources được truyền → cũng tìm item từ các account nguồn (đăng chéo). */
export function getPoolItemForSlot(
  date: string,
  slot: AutoPostSlot,
  accountId?: string,
  contentSources?: string[],
  strictDate = false,
): ContentPoolItem | null {
  const store = readPool();

  // Build set of accepted account IDs
  const acceptedIds = new Set<string>();
  if (accountId) acceptedIds.add(accountId);
  if (contentSources) contentSources.forEach((s) => acceptedIds.add(s));

  const matchAccount = (item: ContentPoolItem) => {
    if (acceptedIds.size === 0) return true; // no filter
    return acceptedIds.has(item.accountId ?? "env-default");
  };

  // Ưu tiên 1: item của chính account (exact date+slot)
  if (accountId) {
    const ownExact = store.items.find(
      (item) =>
        item.date === date &&
        item.slot === slot &&
        item.status === "pending" &&
        (item.accountId ?? "env-default") === accountId,
    );
    if (ownExact) return ownExact;
  }

  // Ưu tiên 2: item từ bất kỳ accepted account (exact date+slot)
  const exact = store.items.find(
    (item) =>
      item.date === date &&
      item.slot === slot &&
      item.status === "pending" &&
      matchAccount(item),
  );
  if (exact) return exact;

  // Nếu yêu cầu strictDate (dùng trong catch-up) → không fallback sang ngày khác
  if (strictDate) return null;

  // Ưu tiên 3: item riêng của account (any date, same slot)
  if (accountId) {
    const ownFallback = store.items
      .filter(
        (item) =>
          item.slot === slot &&
          item.status === "pending" &&
          (item.accountId ?? "env-default") === accountId,
      )
      .sort((a, b) => a.date.localeCompare(b.date));
    if (ownFallback[0]) return ownFallback[0];
  }

  // Ưu tiên 4: item từ bất kỳ accepted account (any date, same slot)
  const pending = store.items
    .filter(
      (item) =>
        item.slot === slot && item.status === "pending" && matchAccount(item),
    )
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
 * Nếu date+slot+account đã tồn tại và vẫn "pending" → ghi đè.
 * Nếu date+slot+account đã "used"/"skipped" → bỏ qua.
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
    const itemAccountId = normalizeAccountId(item.accountId);
    const existingIdx = store.items.findIndex(
      (i) =>
        i.date === item.date &&
        i.slot === item.slot &&
        normalizeAccountId(i.accountId) === itemAccountId,
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

  // Sắp xếp theo ngày → slot (morning → lunch → evening)
  const SLOT_ORDER: Record<string, number> = {
    evening: 0,
  };
  store.items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const slotDelta = (SLOT_ORDER[a.slot] ?? 1) - (SLOT_ORDER[b.slot] ?? 1);
    if (slotDelta !== 0) return slotDelta;
    return normalizeAccountId(a.accountId).localeCompare(
      normalizeAccountId(b.accountId),
    );
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
