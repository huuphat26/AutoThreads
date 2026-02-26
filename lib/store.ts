// ============================================
// AUTO THREADS - Post Store (File-based Storage)
// ============================================
import fs from "fs";
import path from "path";
import type { PostHistory, ScheduledPost } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "post-history.json");

// Đảm bảo thư mục data tồn tại
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Đọc lịch sử bài đăng từ file
export function readHistory(): PostHistory {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    return { posts: [], lastUpdated: new Date().toISOString() };
  }
  const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
  return JSON.parse(raw) as PostHistory;
}

// Ghi lịch sử bài đăng vào file
export function writeHistory(history: PostHistory): void {
  ensureDataDir();
  history.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
}

// Thêm hoặc cập nhật một bài đăng
export function upsertPost(post: ScheduledPost): void {
  const history = readHistory();
  const idx = history.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    history.posts[idx] = post;
  } else {
    history.posts.unshift(post); // Thêm vào đầu danh sách
  }
  // Giữ tối đa 200 bài gần nhất
  if (history.posts.length > 200) {
    history.posts = history.posts.slice(0, 200);
  }
  writeHistory(history);
}

// Lấy bài theo ID
export function getPostById(id: string): ScheduledPost | undefined {
  return readHistory().posts.find((p) => p.id === id);
}

// Lấy danh sách bài theo trạng thái
export function getPostsByStatus(
  status: ScheduledPost["status"],
  limit = 20,
): ScheduledPost[] {
  return readHistory()
    .posts.filter((p) => p.status === status)
    .slice(0, limit);
}

// Lấy thống kê tổng hợp
export function getStats() {
  const history = readHistory();
  const posts = history.posts;
  return {
    total: posts.length,
    posted: posts.filter((p) => p.status === "posted").length,
    failed: posts.filter((p) => p.status === "failed").length,
    pending: posts.filter((p) => p.status === "pending").length,
    draft: posts.filter((p) => p.status === "draft").length,
    lastUpdated: history.lastUpdated,
  };
}

// Tạo ID duy nhất
export function generateId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
