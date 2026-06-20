import fs from "fs";
import path from "path";
import type { ThreadsManualPost, ThreadsManualPostHistory } from "@/types";

const isVercel = process.env.VERCEL === "1";

const HISTORY_FILE = isVercel
  ? path.join("/tmp", "threads-manual-history.json")
  : path.join(process.cwd(), "data", "threads-manual-history.json");

const STATIC_HISTORY_FILE = path.join(process.cwd(), "data", "threads-manual-history.json");

async function syncToKV(history: ThreadsManualPostHistory): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set("threads-manual-history", history);
  } catch (e) {
    console.error("[KV] Failed to sync threads-manual-history:", e);
  }
}

function kvSyncFireAndForget(history: ThreadsManualPostHistory): void {
  if (!isVercel) return;
  syncToKV(history).catch((e) => console.error("[KV] Sync error:", e));
}

export function readManualHistory(): ThreadsManualPostHistory {
  try {
    let fileToRead = HISTORY_FILE;
    if (isVercel && !fs.existsSync(fileToRead)) {
      fileToRead = STATIC_HISTORY_FILE;
    }
    if (!fs.existsSync(fileToRead)) {
      return { posts: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(fileToRead, "utf-8");
    return JSON.parse(raw) as ThreadsManualPostHistory;
  } catch {
    return { posts: [], lastUpdated: new Date().toISOString() };
  }
}

export function writeManualHistory(history: ThreadsManualPostHistory): void {
  history.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  kvSyncFireAndForget(history);
}

export async function initThreadsManualHistoryFromKV(): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    const history = await kv.get<ThreadsManualPostHistory>("threads-manual-history");
    if (history) {
      fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
      console.log("[KV] Loaded threads-manual-history from KV");
    }
  } catch (e) {
    console.error("[KV] Failed to load threads-manual-history:", e);
  }
}

export function upsertManualPost(post: ThreadsManualPost): void {
  const history = readManualHistory();
  const idx = history.posts.findIndex((p) => p.id === post.id);
  if (idx >= 0) {
    history.posts[idx] = post;
  } else {
    history.posts.unshift(post);
    if (history.posts.length > 200) {
      history.posts = history.posts.slice(0, 200);
    }
  }
  writeManualHistory(history);
}

export function getAllManualPosts(): ThreadsManualPost[] {
  return readManualHistory().posts;
}

export function deleteManualPost(id: string): void {
  const history = readManualHistory();
  history.posts = history.posts.filter((p) => p.id !== id);
  writeManualHistory(history);
}
