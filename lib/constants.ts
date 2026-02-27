// ============================================
// Constants — labels, config dùng chung toàn app
// ============================================
import { TOPICS } from "@/lib/topics";
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PencilIcon,
} from "@/components/ui/icons";
import type { FC } from "react";

/** Chủ đề dẫn xuất từ nguồn TOPICS — thêm/sửa tại lib/topics.ts */
export const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t.label]),
);

type StatusConfig = {
  label: string;
  colorClass: string;
  icon: FC<{ className?: string }>;
};

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  posted: {
    label: "Đã đăng",
    colorClass: "bg-slate-100 text-slate-600 border-slate-200",
    icon: CheckCircleIcon,
  },
  pending: {
    label: "Đang chờ",
    colorClass: "bg-stone-100 text-stone-500 border-stone-200",
    icon: ClockIcon,
  },
  failed: {
    label: "Thất bại",
    colorClass: "bg-rose-50 text-rose-500 border-rose-200",
    icon: XCircleIcon,
  },
  draft: {
    label: "Nháp",
    colorClass: "bg-zinc-100 text-zinc-400 border-zinc-200",
    icon: PencilIcon,
  },
};
