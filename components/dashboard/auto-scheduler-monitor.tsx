// ============================================================
// AutoSchedulerMonitor — Theo dõi đăng bài tự động 3 nền tảng
// Hiển thị lịch hôm nay (mỗi slot × 3 nền tảng) + lịch sử
// ============================================================
"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord, AutoPostPlatformStatus } from "@/types";

// ─── Types ───────────────────────────────────────────────────

type SchedulerStatus = {
  enabled: boolean;
  running: boolean;
  timezone: string;
  slots: { id: string; label: string; cron: string }[];
  platformDelayMinutes: number;
  totalRuns: number;
  lastRun: null | {
    id: string;
    triggeredAt: string;
    slot: string;
    overallStatus: string;
    topicLabel?: string;
    facebook: string;
    threads: string;
    instagram: string;
  };
};

// ─── Constants ───────────────────────────────────────────────

const SLOT_HOURS: Record<string, { h: number; m: number }> = {
  noon:    { h: 12, m: 0 },
  evening: { h: 18, m: 0 },
};
const DELAY_MINUTES = 2;
const PLATFORMS = [
  { key: "facebook",  label: "Facebook",  delayMin: 0 },
  { key: "threads",   label: "Threads",   delayMin: DELAY_MINUTES },
  { key: "instagram", label: "Instagram", delayMin: DELAY_MINUTES * 2 },
] as const;

// ─── Helpers ─────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slotDateToday(slotId: string, extraMinutes = 0): Date {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 12, m: 0 };
  const now = new Date();
  const vnNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  vnNow.setHours(h, m + extraMinutes, 0, 0);
  const offset =
    now.getTime() -
    new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getTime();
  return new Date(vnNow.getTime() + offset);
}

function slotTimeLabel(slotId: string, extraMinutes: number): string {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 12, m: 0 };
  const totalMin = m + extraMinutes;
  const hh = String(h + Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isTodayVN(iso: string): boolean {
  const todayKey = new Date().toLocaleDateString("sv", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    new Date(iso).toLocaleDateString("sv", {
      timeZone: "Asia/Ho_Chi_Minh",
    }) === todayKey
  );
}

// ─── Status config ────────────────────────────────────────────

type StatusKey =
  | AutoPostPlatformStatus
  | "running"
  | "completed"
  | "partial"
  | "scheduled"
  | "waiting";

const STATUS_CFG: Record<
  StatusKey,
  { dot: string; pill: string; label: string }
> = {
  scheduled: {
    dot: "bg-slate-300",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
    label: "Đã lên lịch",
  },
  waiting: {
    dot: "bg-slate-200",
    pill: "bg-slate-50 text-slate-400 border-slate-100",
    label: "Chờ lượt",
  },
  pending: {
    dot: "bg-amber-400 animate-pulse",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Đang xử lý",
  },
  posted: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Đã đăng",
  },
  failed: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-600 border-rose-200",
    label: "Thất bại",
  },
  skipped: {
    dot: "bg-slate-300",
    pill: "bg-slate-100 text-slate-400 border-slate-200",
    label: "Bỏ qua",
  },
  running: {
    dot: "bg-blue-400 animate-pulse",
    pill: "bg-blue-50 text-blue-600 border-blue-200",
    label: "Đang chạy",
  },
  completed: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Hoàn thành",
  },
  partial: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Một phần",
  },
};

function Dot({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
    />
  );
}

function Pill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Today slot card ──────────────────────────────────────────

type PlatformResult = AutoPostRecord["facebook"];

function PlatformScheduleRow({
  platformLabel,
  scheduledTime,
  result,
  isPast,
}: {
  platformLabel: string;
  scheduledTime: string;
  result: PlatformResult | null;
  isPast: boolean;
}) {
  const [showError, setShowError] = useState(false);

  const status = result
    ? result.status
    : isPast
      ? "skipped"
      : "scheduled";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-medium text-slate-600 w-20 shrink-0">
        {platformLabel}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-mono font-semibold text-slate-700">
          {scheduledTime}
        </span>
        <span className="text-[10px] text-slate-400">{todayLabel()}</span>
      </div>
      <span className="flex-1" />
      {result?.postedAt && (
        <span className="text-[10px] text-slate-400 shrink-0">
          thực tế {fmtTime(result.postedAt)}
        </span>
      )}
      <Pill status={status} />
      {result?.status === "failed" && result?.errorMessage && (
        <button
          onClick={() => setShowError((v) => !v)}
          className="text-[10px] text-rose-400 hover:text-rose-600 underline underline-offset-2 shrink-0"
        >
          {showError ? "ẩn" : "lỗi"}
        </button>
      )}
      {showError && result?.errorMessage && (
        <div className="absolute left-4 right-4 mt-6 text-[10px] text-rose-500 bg-rose-50 border border-rose-100 rounded px-2 py-1 leading-relaxed z-10">
          {result.errorMessage}
        </div>
      )}
    </div>
  );
}

function TodaySlotCard({
  slotId,
  record,
}: {
  slotId: string;
  record: AutoPostRecord | null;
}) {
  const { h } = SLOT_HOURS[slotId] ?? { h: 12 };
  const slotName = slotId === "noon" ? "Buổi trưa" : "Buổi tối";
  const baseTime = `${String(h).padStart(2, "0")}:00`;
  const now = new Date();
  const isRunning = record?.overallStatus === "running";

  const overallStatus =
    record?.overallStatus ??
    (now > slotDateToday(slotId, 4) ? "skipped" : "scheduled");

  const overallPill = isRunning ? "running" : overallStatus;

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">{slotName}</span>
          <span className="text-xs font-mono text-slate-400">{baseTime}</span>
        </div>
        <div className="flex items-center gap-2">
          {record?.topicLabel && (
            <span className="text-[10px] text-slate-400 truncate max-w-40">
              {record.topicLabel}
            </span>
          )}
          <Pill status={overallPill} />
        </div>
      </div>
      <div className="relative">
        {PLATFORMS.map((p) => {
          const scheduledTime = slotTimeLabel(slotId, p.delayMin);
          const slotDate = slotDateToday(slotId, p.delayMin);
          const platformResult = record
            ? (record[p.key as "facebook" | "threads" | "instagram"] ?? null)
            : null;
          return (
            <PlatformScheduleRow
              key={p.key}
              platformLabel={p.label}
              scheduledTime={scheduledTime}
              result={platformResult}
              isPast={now > slotDate}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── History row ──────────────────────────────────────────────

function HistoryPlatformRow({
  label,
  result,
}: {
  label: string;
  result: PlatformResult;
}) {
  const [showErr, setShowErr] = useState(false);
  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 w-20 shrink-0">
          {label}
        </span>
        {result.postedAt && (
          <span className="text-[10px] text-slate-400">
            {fmtDateTime(result.postedAt)}
          </span>
        )}
        <span className="flex-1" />
        <Pill status={result.status} />
        {result.status === "failed" && result.errorMessage && (
          <button
            onClick={() => setShowErr((v) => !v)}
            className="text-[10px] text-rose-400 hover:text-rose-600 underline underline-offset-2"
          >
            {showErr ? "ẩn" : "lỗi"}
          </button>
        )}
      </div>
      {showErr && result.errorMessage && (
        <p className="mt-1 text-[10px] text-rose-500 bg-rose-50 rounded px-2 py-1 leading-relaxed">
          {result.errorMessage}
        </p>
      )}
    </div>
  );
}

function HistoryRow({ record }: { record: AutoPostRecord }) {
  const [open, setOpen] = useState(false);
  const slotTime = record.slot === "noon" ? "12:00" : "18:00";

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        <Dot status={record.overallStatus} />
        <span className="text-[10px] font-mono text-slate-500 shrink-0 w-9">
          {slotTime}
        </span>
        <span className="text-[10px] text-slate-400 shrink-0">
          {fmtDateTime(record.triggeredAt)}
        </span>
        <span className="text-xs text-slate-600 flex-1 truncate">
          {record.topicLabel ?? "—"}
        </span>
        <span
          className="flex items-center gap-1 shrink-0"
          title="Facebook · Threads · Instagram"
        >
          <Dot status={record.facebook.status} />
          <Dot status={record.threads.status} />
          <Dot status={record.instagram.status} />
        </span>
        <span className="text-slate-300 text-[10px] shrink-0">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40">
          {record.content && (
            <p className="px-3 pt-2 pb-1 text-[11px] text-slate-500 italic leading-relaxed line-clamp-2">
              {record.content.slice(0, 180)}
              {record.content.length > 180 ? "…" : ""}
            </p>
          )}
          <div className="divide-y divide-slate-50">
            {PLATFORMS.map((p) => {
              const r =
                record[p.key as "facebook" | "threads" | "instagram"];
              return (
                <HistoryPlatformRow key={p.key} label={p.label} result={r} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function AutoSchedulerMonitor() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [records, setRecords] = useState<AutoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, h] = await Promise.all([
        fetch("/api/auto-scheduler").then((r) => r.json()),
        fetch("/api/auto-scheduler?view=history").then((r) => r.json()),
      ]);
      if (s.success) setStatus(s.data);
      if (h.success) setRecords(h.data as AutoPostRecord[]);
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  function todayRecord(slotId: string): AutoPostRecord | null {
    return (
      records.find((r) => r.slot === slotId && isTodayVN(r.triggeredAt)) ??
      null
    );
  }

  const historyRecords = records.filter((r) => !isTodayVN(r.triggeredAt));
  const schedulerActive = status?.enabled && status?.running;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Đăng tự động 3 nền tảng
          </h2>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              schedulerActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-slate-100 text-slate-400 border-slate-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                schedulerActive
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-slate-300"
              }`}
            />
            {schedulerActive
              ? "Đang hoạt động"
              : status?.enabled
                ? "Đã bật"
                : "Tắt"}
          </span>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-slate-300 hover:text-slate-500 transition-colors"
        >
          {loading ? (
            <Spinner className="w-3.5 h-3.5" />
          ) : (
            <RefreshIcon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {error && <p className="text-xs text-rose-500">{error}</p>}

        {/* Lịch hôm nay */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Lịch hôm nay — {todayLabel()}
          </p>
          {loading && records.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner className="w-5 h-5 text-slate-300" />
            </div>
          ) : (
            <div className="space-y-2">
              <TodaySlotCard slotId="noon" record={todayRecord("noon")} />
              <TodaySlotCard
                slotId="evening"
                record={todayRecord("evening")}
              />
            </div>
          )}
        </div>

        {/* Lịch sử */}
        {historyRecords.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
            >
              <span>Lịch sử ({historyRecords.length})</span>
              <span className="text-slate-300">{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <div className="space-y-1.5">
                {historyRecords.slice(0, 20).map((r) => (
                  <HistoryRow key={r.id} record={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chú thích */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-50 text-[9px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Đã đăng
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            Thất bại
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Đang xử lý
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
            Đã lên lịch
          </span>
        </div>
      </div>
    </section>
  );
}
