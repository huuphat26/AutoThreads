// ============================================================
// AUTO THREADS — Threads Manual Post Store (File-backed)
// Lưu trữ bài đăng Threads được hẹn giờ thủ công.
// Persist to data/threads-manual-history.json để bài hẹn giờ không mất khi restart.
// Tách biệt với store.ts (dành cho auto-scheduler slot-based).
// ============================================================
import fs from "fs";
import path from "path";
import type {
  ThreadsManualPost,
  ThreadsManualPostHistory,
  ThreadsManualPostStatus,
} from "@/types";

// ─── File path ────────────────────────────────────────────────────────────────
const DATA_FILE = path.join(
  process.cwd(),
  "data",
  "threads-manual-history.json",
);

function loadThreadsManualFromFile(): ThreadsManualPostHistory | null {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw) as ThreadsManualPostHistory;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveThreadsManualToFile(history: ThreadsManualPostHistory): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2), "utf-8");
  } catch {
    // ignore write errors
  }
}

// ─── Global-anchored store ────────────────────────────────────────────────────
const _g = global as typeof global & {
  __threadsManualHistory?: ThreadsManualPostHistory;
};

function ensureThreadsManualStore(): ThreadsManualPostHistory {
  if (!_g.__threadsManualHistory) {
    // Try loading persisted data first
    const fromFile = loadThreadsManualFromFile();
    _g.__threadsManualHistory = fromFile ?? {
      posts: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  return _g.__threadsManualHistory;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function readThreadsManualHistory(): ThreadsManualPostHistory {
  const store = ensureThreadsManualStore();
  return { ...store, posts: [...store.posts] };
}

export function writeThreadsManualHistory(
  history: ThreadsManualPostHistory,
): void {
  const updated = { ...history, lastUpdated: new Date().toISOString() };
  _g.__threadsManualHistory = updated;
  saveThreadsManualToFile(updated);
}

export function upsertThreadsManualPost(post: ThreadsManualPost): void {
  const history = readThreadsManualHistory();
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
  writeThreadsManualHistory(history);
}

export function getThreadsManualPostById(
  id: string,
): ThreadsManualPost | undefined {
  return readThreadsManualHistory().posts.find((p) => p.id === id);
}

export function getThreadsManualPostsByStatus(
  status: ThreadsManualPostStatus,
  limit = 50,
): ThreadsManualPost[] {
  return readThreadsManualHistory()
    .posts.filter((p) => p.status === status)
    .slice(0, limit);
}

/** Lấy tất cả bài đang chờ đăng mà scheduledAt <= now */
export function getDueThreadsManualPosts(): ThreadsManualPost[] {
  const now = Date.now();
  return readThreadsManualHistory().posts.filter(
    (p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now,
  );
}

export function getThreadsManualStats() {
  const posts = readThreadsManualHistory().posts;
  return {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    posted: posts.filter((p) => p.status === "posted").length,
    failed: posts.filter((p) => p.status === "failed").length,
    pending: posts.filter((p) => p.status === "pending").length,
    cancelled: posts.filter((p) => p.status === "cancelled").length,
  };
}

export function generateThreadsManualId(): string {
  return `tm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
