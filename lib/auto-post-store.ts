// ============================================================
// AUTO THREADS — Auto Post Store
// Lưu lịch sử mỗi lần auto-post 3 nền tảng (12:00 / 18:00).
// File: data/auto-post-history.json
// ============================================================
import fs from "fs";
import path from "path";
import type { AutoPostRecord, AutoPostHistory } from "@/types";

const isVercel = process.env.VERCEL === "1";

const HISTORY_FILE = isVercel
  ? path.join("/tmp", "auto-post-history.json")
  : path.join(process.cwd(), "data", "auto-post-history.json");

const STATIC_HISTORY_FILE = path.join(process.cwd(), "data", "auto-post-history.json");

async function syncToKV(history: AutoPostHistory): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set("auto-post-history", history);
  } catch (e) {
    console.error("[KV] Failed to sync auto-post-history:", e);
  }
}

function kvSyncFireAndForget(history: AutoPostHistory): void {
  if (!isVercel) return;
  syncToKV(history).catch((e) => console.error("[KV] Sync error:", e));
}

// ─── Helpers ──────────────────────────────────────────────────

function readHistory(): AutoPostHistory {
  try {
    let fileToRead = HISTORY_FILE;
    if (isVercel && !fs.existsSync(fileToRead)) {
      fileToRead = STATIC_HISTORY_FILE;
    }
    if (!fs.existsSync(fileToRead)) {
      return { records: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(fileToRead, "utf-8");
    return JSON.parse(raw) as AutoPostHistory;
  } catch {
    return { records: [], lastUpdated: new Date().toISOString() };
  }
}

function writeHistory(history: AutoPostHistory): void {
  history.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
  kvSyncFireAndForget(history);
}

export async function initAutoPostHistoryFromKV(): Promise<void> {
  if (!isVercel) return;
  try {
    const { kv } = await import("@vercel/kv");
    const history = await kv.get<AutoPostHistory>("auto-post-history");
    if (history) {
      fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
      console.log("[KV] Loaded auto-post-history from KV");
    }
  } catch (e) {
    console.error("[KV] Failed to load auto-post-history:", e);
  }
}

// ─── Public API ───────────────────────────────────────────────

export function upsertAutoRecord(record: AutoPostRecord): void {
  const history = readHistory();
  const idx = history.records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    history.records[idx] = record;
  } else {
    history.records.unshift(record); // mới nhất trước
    // Giới hạn 200 records
    if (history.records.length > 200) {
      history.records = history.records.slice(0, 200);
    }
  }
  writeHistory(history);
}

export function getAutoRecord(id: string): AutoPostRecord | undefined {
  return readHistory().records.find((r) => r.id === id);
}

export function getAllAutoRecords(): AutoPostRecord[] {
  return readHistory().records;
}

export function generateAutoId(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
