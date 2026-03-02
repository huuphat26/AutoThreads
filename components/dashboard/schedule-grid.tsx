// ScheduleGrid — hiển thị lịch đăng cố định trong ngày kèm trạng thái từng slot
"use client";

import type { SchedulerStatus, ScheduledPost } from "@/types";

const TZ = "Asia/Ho_Chi_Minh";

function toVNDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv", { timeZone: TZ }); // "YYYY-MM-DD"
}
function toVNHour(iso: string) {
  return parseInt(
    new Date(iso).toLocaleString("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }),
    10,
  );
}
function toVNTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
function currentVNHour() {
  return toVNHour(new Date().toISOString());
}

/**
 * Kiểm tra xem một slot có bị "bỏ lỡ" không:
 * - Giờ của slot đã qua trong ngày hôm nay
 * - Chưa có bài đăng nào cho slot đó
 * - Server chưa chạy lúc slot đó kích hoạt
 *   (serverStartedAt > thời điểm slot hôm nay  HOẶC  server chưa từng chạy)
 */
function isMissedSlot(
  slotHour: number,
  done: boolean,
  serverStartedAt?: string,
): boolean {
  if (done) return false;
  const nowHour = currentVNHour();
  if (slotHour > nowHour) return false; // slot chưa đến giờ

  if (!serverStartedAt) return true; // server chưa từng chạy → chắc chắn bỏ lỡ

  // Xác định thời điểm slot hôm nay theo UTC (VN = UTC+7)
  const todayKey = new Date().toLocaleDateString("sv", { timeZone: TZ });
  const slotLocalISO = `${todayKey}T${String(slotHour).padStart(2, "0")}:00:00`;
  const slotTimeUTC = new Date(
    new Date(slotLocalISO).getTime() - 7 * 60 * 60 * 1000,
  );

  const startedAt = new Date(serverStartedAt);
  // Server khởi động SAU giờ slot → không catch được cron → bỏ lỡ
  return startedAt > slotTimeUTC;
}

type Props = {
  status: SchedulerStatus | null;
  posts: ScheduledPost[];
  onRunMissedSlot?: () => Promise<void> | void;
  runningMissed?: boolean;
  onSkipSlot?: (slotId: string) => Promise<void> | void;
};

export function ScheduleGrid({
  status,
  posts,
  onRunMissedSlot,
  runningMissed = false,
  onSkipSlot,
}: Props) {
  // Không dùng local state nữa — lấy từ server qua status.skippedSlots

  if (!status || !status.jobs || status.jobs.length === 0) return null;

  const todayKey = new Date().toLocaleDateString("sv", { timeZone: TZ });
  const skipped = new Set(status.skippedSlots ?? []);

  // Tất cả bài tự động đã đăng hôm nay, sắp theo giờ
  const autoToday = posts
    .filter(
      (p) =>
        p.source === "auto" &&
        p.status === "posted" &&
        p.postedAt &&
        toVNDate(p.postedAt) === todayKey,
    )
    .sort(
      (a, b) =>
        new Date(a.postedAt!).getTime() - new Date(b.postedAt!).getTime(),
    );

  const limit = status.dailyPostLimit ?? status.jobs.length;
  const doneCount = autoToday.length;
  const allDone = doneCount >= limit;

  const dismissSlot = (id: string) =>
    setDismissedSlots((prev) => new Set(prev).add(id));

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Lịch đăng hôm nay
        </p>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            allDone
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "text-slate-500"
          }`}
        >
          {doneCount}/{limit} bài{allDone && " ✓"}
        </span>
      </div>

      {/* Slot list */}
      <div className="divide-y divide-slate-100">
        {status.jobs.map((job, idx) => {
          const hour = parseInt(job.cronExpression.split(" ")[1], 10);
          const timeLabel = `${String(hour).padStart(2, "0")}:00`;

          // Tìm bài auto khớp slot: ưu tiên giờ đăng đúng cron hour, fallback theo index
          const matchedPost =
            autoToday.find((p) => toVNHour(p.postedAt!) === hour) ??
            autoToday[idx];

          const done = !!matchedPost;
          const missed = isMissedSlot(hour, done, status.serverStartedAt);
          const dismissed = skipped.has(job.id);

          return (
            <div key={job.id} className="flex flex-col">
              {/* Row chính */}
              <div className="flex items-center justify-between px-3.5 py-3">
                {/* Left: icon + time + post info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-semibold ${
                      done
                        ? "bg-emerald-50 text-emerald-500"
                        : missed
                          ? "bg-amber-50 text-amber-500"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? "✓" : missed ? "⚠" : "🕐"}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        done
                          ? "text-emerald-600"
                          : missed
                            ? "text-amber-600"
                            : "text-slate-700"
                      }`}
                    >
                      {timeLabel}
                      {done && matchedPost.postedAt && (
                        <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                          đã đăng lúc {toVNTime(matchedPost.postedAt)}
                        </span>
                      )}
                    </p>
                    {done && matchedPost.topicLabel ? (
                      <p className="text-[10px] text-slate-400 truncate">
                        {matchedPost.topicLabel}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400">{job.label}</p>
                    )}
                  </div>
                </div>

                {/* Right: status chip */}
                {done ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                    Đã đăng
                  </span>
                ) : missed ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                    Bị bỏ lỡ
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                    Chờ
                  </span>
                )}
              </div>

              {/* Banner cảnh báo bỏ lỡ */}
              {missed && !dismissed && (
                <div className="mx-3 mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-amber-700 leading-tight">
                    ⚠ Bài đăng {timeLabel} chưa được chạy
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5 leading-snug">
                    Web chưa khởi động lúc khung giờ này nên lịch tự động không
                    kịp kích hoạt.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {onRunMissedSlot && (
                      <button
                        onClick={() => onRunMissedSlot()}
                        disabled={runningMissed}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white transition-colors"
                      >
                        {runningMissed ? "Đang chạy…" : "Chạy ngay"}
                      </button>
                    )}
                    <button
                      onClick={() => onSkipSlot?.(job.id)}
                      className="text-[10px] font-medium text-amber-500 hover:text-amber-700 transition-colors"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
