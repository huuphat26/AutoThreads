// ============================================================
// AUTO THREADS — Facebook Post Store (File-backed)
// Lưu trữ bài đăng Facebook được hẹn giờ và lịch sử đăng bài.
// Persist to data/fb-post-history.json để bài hẹn giờ không mất khi restart.
// ============================================================
import fs from "fs";
import path from "path";
import type { FBScheduledPost, FBPostHistory, FBPostStatus } from "@/types";

// ─── File path ────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), "data", "fb-post-history.json");

function loadFBFromFile(): FBPostHistory | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as FBPostHistory;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveFBToFile(history: FBPostHistory): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch {
    // ignore write errors (e.g. serverless read-only fs)
  }
}

// ─── Global-anchored store (shared across all Next.js module instances) ────────
const _g = global as typeof global & { __fbHistory?: FBPostHistory };

function ensureFBStore(): FBPostHistory {
  if (!_g.__fbHistory) {
    // Try loading persisted data first
    const fromFile = loadFBFromFile();
    _g.__fbHistory = fromFile ?? {
      posts: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  return _g.__fbHistory;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function readFBHistory(): FBPostHistory {
  const store = ensureFBStore();
  return { ...store, posts: [...store.posts] };
}

export function writeFBHistory(history: FBPostHistory): void {
  const updated = { ...history, lastUpdated: new Date().toISOString() };
  _g.__fbHistory = updated;
  saveFBToFile(updated);
}

export function upsertFBPost(post: FBScheduledPost): void {
  const history = readFBHistory();
  const idx = history.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    history.posts[idx] = post;
  } else {
    history.posts.unshift(post);
  }
  // Giữ tối đa 200 bài gần nhất
  if (history.posts.length > 200) {
    history.posts = history.posts.slice(0, 200);
  }
  writeFBHistory(history);
}

export function getFBPostById(id: string): FBScheduledPost | undefined {
  return readFBHistory().posts.find((p) => p.id === id);
}

export function removeFBPost(id: string): boolean {
  const history = readFBHistory();
  const before = history.posts.length;
  history.posts = history.posts.filter((p) => p.id !== id);
  if (history.posts.length < before) {
    writeFBHistory(history);
    return true;
  }
  return false;
}

export function getFBPostsByStatus(
  status: FBPostStatus,
  limit = 50,
): FBScheduledPost[] {
  return readFBHistory()
    .posts.filter((p) => p.status === status)
    .slice(0, limit);
}

/** Lấy tất cả bài đang chờ đăng mà scheduledAt <= now */
export function getDueFBPosts(): FBScheduledPost[] {
  const now = Date.now();
  return readFBHistory().posts.filter(
    (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now,
  );
}

export function getFBStats() {
  const posts = readFBHistory().posts;
  return {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    posted: posts.filter((p) => p.status === "posted").length,
    failed: posts.filter((p) => p.status === "failed").length,
    pending: posts.filter((p) => p.status === "pending").length,
    cancelled: posts.filter((p) => p.status === "cancelled").length,
  };
}

export function generateFBId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
