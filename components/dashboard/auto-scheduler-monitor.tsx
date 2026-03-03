// ============================================================
// AutoSchedulerMonitor — Theo dõi đăng bài tự động 3 nền tảng
// ============================================================
"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord, AutoPostPlatformStatus } from "@/types";

// ─── Types API response ───────────────────────────────────────

type SchedulerStatus = {
  enabled: boolean;
  running: boolean;
  timezone: string;
  slots: { id: string; label: string; cron: string }[];
  platformDelayMinutes: number;
  totalRuns: number;
  lastRun: {
    id: string;
    triggeredAt: string;
    slot: string;
    overallStatus: string;
    topicLabel?: string;
    facebook: string;
    threads: string;
    instagram: string;
  } | null;
};

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

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

// ─── Status dot + badge ───────────────────────────────────────

const STATUS_CONFIG: Record<
  AutoPostPlatformStatus | "running" | "completed" | "partial" | "skipped",
  { dot: string; text: string; label: string }
> = {
  pending:   { dot: "bg-amber-400",  text: "text-amber-600",  label: "Đang chờ" },
  posted:    { dot: "bg-emerald-500", text: "text-emerald-600", label: "Đã đăng" },
  failed:    { dot: "bg-rose-500",   text: "text-rose-600",   label: "Thất bại" },
  skipped:   { dot: "bg-slate-300",  text: "text-slate-400",  label: "Bỏ qua"  },
  running:   { dot: "bg-blue-400 animate-pulse", text: "text-blue-600", label: "Đang chạy" },
  completed: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Hoàn thành" },
  partial:   { dot: "bg-amber-400",  text: "text-amber-600",  label: "Một phần" },
};

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.skipped;
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.skipped;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Platform row in history card ────────────────────────────

function PlatformRow({
  label,
  result,
}: {
  label: string;
  result: AutoPostRecord["facebook"];
}) {
  const [showError, setShowError] = useState(false);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        {result.postedAt && (
          <span className="text-[10px] text-slate-400">{fmtTime(result.postedAt)}</span>
        )}
        <StatusBadge status={result.status} />
        {result.status === "failed" && result.errorMessage && (
          <button
            onClick={() => setShowError((v) => !v)}
            className="text-[10px] text-rose-400 hover:text-rose-600 underline underline-offset-2"
          >
            {showError ? "ẩn" : "lỗi"}
          </button>
        )}
      </div>
      {showError && result.errorMessage && (
        <div className="col-span-2 mt-0.5 text-[10px] text-rose-500 bg-rose-50 rounded px-2 py-1 leading-relaxed w-full">
          {result.errorMessage}
        </div>
      )}
    </div>
  );
}

// ─── Single history record card ───────────────────────────────

function RecordCard({ record }: { record: AutoPostRecord }) {
  const [open, setOpen] = useState(false);
  const slotLabel = record.slot === "noon" ? "12:00" : "18:00";

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Row header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
      >
        <StatusDot status={record.overallStatus} />

        <span className="text-xs font-medium text-slate-500 shrink-0 w-11">
          {slotLabel}
        </span>

        <span className="text-xs text-slate-600 flex-1 truncate">
          {record.topicLabel ?? "—"}
        </span>

        <span className="text-[10px] text-slate-400 shrink-0">
          {fmtDateTime(record.triggeredAt)}
        </span>

        {/* 3 platform dots */}
        <div className="flex items-center gap-1 shrink-0">
          <StatusDot status={record.facebook.status} />
          <StatusDot status={record.threads.status} />
          <StatusDot status={record.instagram.status} />
        </div>

        <span className="text-slate-300 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 space-y-0.5 bg-slate-50/40">
          {record.content && (
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 mb-2 italic">
              {record.content.slice(0, 200)}{record.content.length > 200 ? "…" : ""}
            </p>
          )}
          <PlatformRow label="Facebook"  result={record.facebook} />
          <PlatformRow label="Threads"   result={record.threads} />
          <PlatformRow label="Instagram" result={record.instagram} />
          {record.igImageUrl && (
            <p className="text-[10px] text-slate-400 pt-1 truncate">
              IG ảnh: {record.igImageUrl}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status header row ────────────────────────────────────────

function SchedulerStatusRow({ status }: { status: SchedulerStatus }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Enabled indicator */}
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          status.enabled && status.running
            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
            : "bg-slate-100 text-slate-400 border-slate-200"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status.enabled && status.running ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
          }`}
        />
        {status.enabled && status.running ? "Đang hoạt động" : status.enabled ? "Đã bật, chờ chạy" : "Tắt"}
      </span>

      {/* Slots */}
      {status.slots.map((s) => (
        <span
          key={s.id}
          className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-mono"
        >
          {s.id === "noon" ? "12:00" : "18:00"}
        </span>
      ))}

      <span className="text-[10px] text-slate-400">
        FB → +2 phút → Threads → +2 phút → IG
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function AutoSchedulerMonitor() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [records, setRecords] = useState<AutoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch("/api/auto-scheduler"),
        fetch("/api/auto-scheduler?view=history"),
      ]);
      const statusJson = await statusRes.json();
      const historyJson = await historyRes.json();

      if (statusJson.success) setStatus(statusJson.data);
      if (historyJson.success) setRecords(historyJson.data as AutoPostRecord[]);
    } catch {
      setError("Không thể tải dữ liệu auto-scheduler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayedRecords = showAll ? records : records.slice(0, 7);

  // Legend
  const todayKey = new Date().toLocaleDateString("sv", { timeZone: "Asia/Ho_Chi_Minh" });
  const todayRecords = records.filter(
    (r) =>
      new Date(r.triggeredAt).toLocaleDateString("sv", {
        timeZone: "Asia/Ho_Chi_Minh",
      }) === todayKey,
  );
  const todayCompleted = todayRecords.filter((r) => r.overallStatus === "completed").length;
  const todayFailed    = todayRecords.filter((r) => r.overallStatus === "failed").length;
  const todayPartial   = todayRecords.filter((r) => r.overallStatus === "partial").length;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Đăng tự động 3 nền tảng
        </h2>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-slate-300 hover:text-slate-500 transition-colors"
        >
          {loading ? <Spinner className="w-3.5 h-3.5" /> : <RefreshIcon className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="px-5 py-3 space-y-3">
        {/* Scheduler status */}
        {status && <SchedulerStatusRow status={status} />}

        {error && (
          <p className="text-xs text-rose-500">{error}</p>
        )}

        {/* Today summary */}
        {todayRecords.length > 0 && (
          <div className="flex items-center gap-3 text-xs py-1 border-t border-slate-50">
            <span className="text-slate-400 text-[11px]">Hôm nay</span>
            {todayCompleted > 0 && (
              <span className="text-emerald-600 font-semibold text-[11px]">
                {todayCompleted} hoàn thành
              </span>
            )}
            {todayPartial > 0 && (
              <span className="text-amber-600 font-semibold text-[11px]">
                {todayPartial} một phần
              </span>
            )}
            {todayFailed > 0 && (
              <span className="text-rose-500 font-semibold text-[11px]">
                {todayFailed} thất bại
              </span>
            )}
          </div>
        )}

        {/* Column header */}
        {records.length > 0 && (
          <div className="flex items-center gap-3 px-3 text-[9px] font-semibold text-slate-300 uppercase tracking-wide">
            <span className="w-2 shrink-0" />
            <span className="w-11 shrink-0">Slot</span>
            <span className="flex-1">Chủ đề</span>
            <span className="w-28 text-right">Thời gian</span>
            <span className="w-12 text-right">FB·T·IG</span>
            <span className="w-4" />
          </div>
        )}

        {/* History list */}
        {loading && records.length === 0 ? (
          <div className="flex justify-center py-6">
            <Spinner className="w-5 h-5 text-slate-300" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-300">
            Chưa có lần đăng tự động nào
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}

        {/* Show more / less */}
        {records.length > 7 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
          >
            {showAll ? `Thu gọn` : `Xem thêm ${records.length - 7} lần nữa`}
          </button>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 pt-1 border-t border-slate-50 text-[9px] text-slate-300">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Đã đăng</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />Thất bại</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Đang chờ</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />Bỏ qua</span>
          <span className="ml-auto">3 chấm = FB · Threads · IG</span>
        </div>
      </div>
    </section>
  );
}
