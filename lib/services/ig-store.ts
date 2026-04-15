// ============================================================
// AUTO THREADS — Instagram Post Store (File-backed)
// Lưu trữ bài đăng Instagram được hẹn giờ và lịch sử đăng bài.
// Persist to data/ig-post-history.json để bài hẹn giờ không mất khi restart.
// ============================================================
import fs from "fs";
import path from "path";
import type { IGScheduledPost, IGPostHistory, IGPostStatus } from "@/types";

// ─── File path ────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(process.cwd(), "data", "ig-post-history.json");

function loadIGFromFile(): IGPostHistory | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as IGPostHistory;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveIGToFile(history: IGPostHistory): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch {
    // ignore write errors
  }
}

// ─── Global-anchored store ───────────────────────────────────────────────────────────────
const _g = global as typeof global & { __igHistory?: IGPostHistory };

function ensureIGStore(): IGPostHistory {
  if (!_g.__igHistory) {
    // Try loading persisted data first
    const fromFile = loadIGFromFile();
    _g.__igHistory = fromFile ?? {
      posts: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  return _g.__igHistory;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function readIGHistory(): IGPostHistory {
  const store = ensureIGStore();
  return { ...store, posts: [...store.posts] };
}

export function writeIGHistory(history: IGPostHistory): void {
  const updated = { ...history, lastUpdated: new Date().toISOString() };
  _g.__igHistory = updated;
  saveIGToFile(updated);
}

export function upsertIGPost(post: IGScheduledPost): void {
  const history = readIGHistory();
  const idx = history.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    history.posts[idx] = post;
  } else {
    history.posts.unshift(post);
  }
  if (history.posts.length > 200) {
    history.posts = history.posts.slice(0, 200);
  }
  writeIGHistory(history);
}

export function getIGPostById(id: string): IGScheduledPost | undefined {
  return readIGHistory().posts.find((p) => p.id === id);
}

export function removeIGPost(id: string): boolean {
  const history = readIGHistory();
  const before = history.posts.length;
  history.posts = history.posts.filter((p) => p.id !== id);
  if (history.posts.length < before) {
    writeIGHistory(history);
    return true;
  }
  return false;
}

export function getIGPostsByStatus(
  status: IGPostStatus,
  limit = 50,
): IGScheduledPost[] {
  return readIGHistory()
    .posts.filter((p) => p.status === status)
    .slice(0, limit);
}

/** Lấy tất cả bài đang hẹn giờ mà scheduledAt <= now */
export function getDueIGPosts(): IGScheduledPost[] {
  const now = Date.now();
  return readIGHistory().posts.filter(
    (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now,
  );
}

export function getIGStats() {
  const posts = readIGHistory().posts;
  return {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    posted: posts.filter((p) => p.status === "posted").length,
    failed: posts.filter((p) => p.status === "failed").length,
    pending: posts.filter((p) => p.status === "pending").length,
    cancelled: posts.filter((p) => p.status === "cancelled").length,
  };
}

export function generateIGId(): string {
  return `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
