// SchedulerMonitor — bảng quan sát hệ thống tự động
"use client";

import type { SchedulerStatus, ScheduledPost, ProviderInfo } from "@/types";

type Props = {
  status: SchedulerStatus | null;
  lastRefreshed: Date | null;
  countdown: number;
  posts: ScheduledPost[];
  aiProvider: ProviderInfo;
  aiProviders: ProviderInfo[];
  onProviderChange: (id: string) => void;
  onModelChange: (providerId: string, model: string) => void;
  onTogglePause: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function vnNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
}

function vnClock(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({
  running,
  enabled,
}: {
  running: boolean;
  enabled: boolean;
}) {
  if (!enabled)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        Đã tắt
      </span>
    );
  if (running)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="relative flex w-1.5 h-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
        </span>
        Đang chạy
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      Đã dừng
    </span>
  );
}

function ModeBadge({
  testMode,
  intervalMin,
}: {
  testMode: boolean;
  intervalMin: number | null;
}) {
  if (testMode)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        🧪 Test · {intervalMin}p/lần
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      🏭 Production
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SchedulerMonitor({
  status,
  lastRefreshed,
  countdown,
  posts,
  aiProvider,
  aiProviders,
  onProviderChange,
  onModelChange,
  onTogglePause,
}: Props) {
  // Latest posted post
  const lastPost =
    [...posts]
      .filter((p) => p.status === "posted" && p.postedAt)
      .sort(
        (a, b) =>
          new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime(),
      )[0] ?? null;

  // Today's stats (VN date)
  const todayKey = vnNow().toLocaleDateString("sv"); // "YYYY-MM-DD"
  const todayPosted = posts.filter(
    (p) =>
      p.status === "posted" &&
      p.postedAt &&
      new Date(p.postedAt).toLocaleDateString("sv", {
        timeZone: "Asia/Ho_Chi_Minh",
      }) === todayKey,
  ).length;
  const todayFailed = posts.filter(
    (p) =>
      p.status === "failed" &&
      new Date(p.scheduledAt).toLocaleDateString("sv", {
        timeZone: "Asia/Ho_Chi_Minh",
      }) === todayKey,
  ).length;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Hệ thống tự động
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {lastRefreshed && (
            <span>
              Cập nhật{" "}
              {lastRefreshed.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <span
            className="tabular-nums font-medium"
            style={{ color: countdown <= 5 ? "#f59e0b" : undefined }}
          >
            ↻ {countdown}s
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge
            running={status?.running ?? false}
            enabled={status?.enabled ?? false}
          />
          <ModeBadge
            testMode={status?.testMode ?? false}
            intervalMin={status?.testIntervalMin ?? null}
          />

          {/* Pause / Resume button — only shown when scheduler is running */}
          {status?.enabled && status?.running && (
            <button
              onClick={onTogglePause}
              title={status.paused ? "Tiếp tục chạy" : "Tạm dừng"}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                status.paused
                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              }`}
            >
              {status.paused ? (
                <>
                  <span>▶</span> Tiếp tục
                </>
              ) : (
                <>
                  <span>⏸</span> Tạm dừng
                </>
              )}
            </button>
          )}

          <span className="ml-auto text-xs font-mono text-slate-400 tabular-nums">
            🕐 {vnClock()} (VN)
          </span>
        </div>

        {/* AI Engine — provider + model selector */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
          {/* Provider row */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{
                  background: aiProvider.available ? "#34d399" : "#f87171",
                }}
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                AI Engine
              </span>
              <span className="text-xs font-semibold text-slate-700 truncate">
                {aiProvider.label}
              </span>
            </div>
            <select
              value={aiProvider.id}
              onChange={(e) => onProviderChange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0 cursor-pointer"
            >
              {aiProviders.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.label}
                  {!p.available ? " ⚠ chưa cấu hình" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Model list for active provider */}
          <div className="px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Model — {aiProvider.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aiProvider.models.map((m) => (
                <button
                  key={m}
                  onClick={() => onModelChange(aiProvider.id, m)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                    m === aiProvider.model
                      ? "bg-slate-800 border-slate-700 text-white font-semibold"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                  }`}
                >
                  {m === aiProvider.model && (
                    <span className="mr-1 text-emerald-400">●</span>
                  )}
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Test mode: no schedule grid, just interval note */}
        {status?.testMode && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
            Tự động đăng mỗi <strong>{status.testIntervalMin} phút</strong>
          </div>
        )}

        {/* Activity row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          {/* Hôm nay */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Hôm nay:</span>
            <span className="font-semibold text-emerald-600">
              ✓ {todayPosted} đăng
            </span>
            {todayFailed > 0 && (
              <span className="font-semibold text-rose-500">
                ✗ {todayFailed} lỗi
              </span>
            )}
          </div>

          {/* Last post */}
          {lastPost ? (
            <span className="text-xs text-slate-400 text-right max-w-50 truncate">
              Cuối:{" "}
              <span className="text-slate-600 font-medium">
                {relativeTime(lastPost.postedAt!)}
              </span>
            </span>
          ) : (
            <span className="text-xs text-slate-300">Chưa có bài nào</span>
          )}
        </div>
      </div>
    </section>
  );
}
