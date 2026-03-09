import type { AutoPostPlatformStatus } from "@/types";

// ─── Scheduler API response shape ────────────────────────────

export type SchedulerStatus = {
  enabled: boolean;
  running: boolean;
  timezone: string;
  slots: { id: string; label: string; prepCron: string; postCron: string }[];
  platformDelayMinutes: number;
  retryWindowMinutes?: number;
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

// ─── Status display config ────────────────────────────────────

export type StatusKey =
  | AutoPostPlatformStatus
  | "running"
  | "completed"
  | "partial"
  | "failed"
  | "scheduled"
  | "waiting"
  | "waiting_for_ai"
  | "content_ready"
  | "no_image"
  | "dismissed";

export const STATUS_CFG: Record<
  StatusKey,
  { dot: string; pill: string; label: string }
> = {
  waiting_for_ai: {
    dot: "bg-violet-400 animate-pulse",
    pill: "bg-violet-50 text-violet-600 border-violet-200",
    label: "Đang soạn AI",
  },
  content_ready: {
    dot: "bg-sky-400",
    pill: "bg-sky-50 text-sky-600 border-sky-200",
    label: "Chờ đăng bài",
  },
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
  no_image: {
    dot: "bg-rose-400",
    pill: "bg-rose-50 text-rose-600 border-rose-200",
    label: "Thiếu ảnh",
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
  dismissed: {
    dot: "bg-slate-300",
    pill: "bg-slate-100 text-slate-400 border-slate-200",
    label: "Đã bỏ qua",
  },
};
