import fs from "fs";
import path from "path";
import type { ThreadsManualPost, ThreadsManualPostHistory } from "@/types";

const HISTORY_FILE = path.join(process.cwd(), "data", "threads-manual-history.json");

export function readManualHistory(): ThreadsManualPostHistory {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return { posts: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as ThreadsManualPostHistory;
  } catch {
    return { posts: [], lastUpdated: new Date().toISOString() };
  }
}

export function writeManualHistory(history: ThreadsManualPostHistory): void {
  history.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
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
