// ============================================================
// AUTO THREADS — IG Auto Image Pool
// Quản lý danh sách ảnh cho Instagram auto-post.
// Chọn theo round-robin để ảnh không bị lặp liên tiếp.
// Thêm / sửa URL ảnh trong data/ig-auto-images.json
// ============================================================
import fs from "fs";
import path from "path";

const POOL_FILE = path.join(process.cwd(), "data", "ig-auto-images.json");

interface ImageEntry {
  url: string;
  label: string;
}

interface ImagePool {
  lastUsedIndex: number;
  images: ImageEntry[];
  _comment?: string;
}

function readPool(): ImagePool {
  try {
    const raw = fs.readFileSync(POOL_FILE, "utf-8");
    return JSON.parse(raw) as ImagePool;
  } catch {
    // Fallback nếu file bị mất
    return { lastUsedIndex: -1, images: [] };
  }
}

function writePool(pool: ImagePool): void {
  try {
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool, null, 2), "utf-8");
  } catch (err) {
    console.error("[IG ImagePool] Không thể ghi pool file:", err);
  }
}

/**
 * Lấy URL ảnh tiếp theo theo round-robin.
 * Tự động cập nhật lastUsedIndex vào file.
 *
 * @returns { url, label } — null nếu pool rỗng
 */
export function getNextIGImage(): ImageEntry | null {
  const pool = readPool();

  if (!pool.images || pool.images.length === 0) {
    console.warn("[IG ImagePool] ⚠️  Pool ảnh trống. Thêm URL vào data/ig-auto-images.json");
    return null;
  }

  const nextIndex = (pool.lastUsedIndex + 1) % pool.images.length;
  const entry = pool.images[nextIndex];

  // Cập nhật cursor
  pool.lastUsedIndex = nextIndex;
  writePool(pool);

  console.log(`[IG ImagePool] ✅ Chọn ảnh #${nextIndex}: ${entry.label}`);
  return entry;
}

/**
 * Xem trước ảnh tiếp theo sẽ được dùng (không thay đổi index)
 */
export function peekNextIGImage(): ImageEntry | null {
  const pool = readPool();
  if (!pool.images || pool.images.length === 0) return null;
  const nextIndex = (pool.lastUsedIndex + 1) % pool.images.length;
  return pool.images[nextIndex];
}

/**
 * Trả về toàn bộ pool để hiển thị trên UI
 */
export function getIGImagePool(): { images: ImageEntry[]; lastUsedIndex: number } {
  const pool = readPool();
  return { images: pool.images ?? [], lastUsedIndex: pool.lastUsedIndex ?? -1 };
}
