// ============================================
// AUTO THREADS - Post Store (In-memory Storage)
// Dùng in-memory store để tương thích với Vercel serverless.
// Lưu ý: data sẽ reset khi serverless instance khởi động lại.
// ============================================
import type { PostHistory, ScheduledPost } from "@/types";

// ─── In-memory store ──────────────────────────────────────────────────────────

let _history: PostHistory = {
  posts: [],
  lastUpdated: new Date().toISOString(),
};

// Đọc lịch sử bài đăng
export function readHistory(): PostHistory {
  return { ..._history, posts: [..._history.posts] };
}

// Ghi lịch sử bài đăng
export function writeHistory(history: PostHistory): void {
  _history = { ...history, lastUpdated: new Date().toISOString() };
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

// Xóa bài theo ID
export function removePost(id: string): boolean {
  const history = readHistory();
  const before = history.posts.length;
  history.posts = history.posts.filter((p) => p.id !== id);
  if (history.posts.length < before) {
    writeHistory(history);
    return true;
  }
  return false;
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
