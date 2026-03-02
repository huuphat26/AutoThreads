"use client";

import type { SchedulerStatus, ScheduledPost } from "@/types";
import { ScheduleGrid } from "./schedule-grid";

type Props = {
  status: SchedulerStatus | null;
  lastRefreshed: Date | null;
  countdown: number;
  posts: ScheduledPost[];
  onTogglePause?: () => void;
  onRunMissedSlot?: () => Promise<void> | void;
  runningMissed?: boolean;
  onSkipSlot?: (slotId: string) => Promise<void> | void;
};

function vnNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
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

export function SchedulerMonitor({
  status,
  lastRefreshed,
  countdown,
  posts,
  onRunMissedSlot,
  runningMissed,
  onSkipSlot,
}: Props) {
  const lastPost =
    [...posts]
      .filter((p) => p.status === "posted" && p.postedAt)
      .sort(
        (a, b) =>
          new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime(),
      )[0] ?? null;

  const todayKey = vnNow().toLocaleDateString("sv");
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
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Bộ lịch Threads
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

      <div className="px-5 py-2 space-y-2">
        <ScheduleGrid
          status={status}
          posts={posts}
          onRunMissedSlot={onRunMissedSlot}
          runningMissed={runningMissed}
          onSkipSlot={onSkipSlot}
        />

        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
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
