// ============================================================
// AUTO THREADS — Auto Post Store
// Lưu lịch sử mỗi lần auto-post 3 nền tảng (12:00 / 18:00).
// File: data/auto-post-history.json
// ============================================================
import fs from "fs";
import path from "path";
import type { AutoPostRecord, AutoPostHistory } from "@/types";

const HISTORY_FILE = path.join(process.cwd(), "data", "auto-post-history.json");

// ─── Helpers ──────────────────────────────────────────────────

function readHistory(): AutoPostHistory {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return { records: [], lastUpdated: new Date().toISOString() };
    }
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as AutoPostHistory;
  } catch {
    return { records: [], lastUpdated: new Date().toISOString() };
  }
}

function writeHistory(history: AutoPostHistory): void {
  history.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
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
