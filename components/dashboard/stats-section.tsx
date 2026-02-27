// StatsSection — 4 thẻ thống kê
import { StatCard } from "@/components/ui/stat-card";
import {
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import type { DashboardStats } from "@/hooks/use-dashboard";

type Props = { stats: DashboardStats };

export function StatsSection({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard
        label="Tổng bài"
        value={stats.total}
        icon={DocumentIcon}
        accent="bg-white text-slate-600 shadow-sm border border-slate-100"
      />
      <StatCard
        label="Đã đăng"
        value={stats.posted}
        icon={CheckCircleIcon}
        accent="bg-white text-emerald-600 shadow-sm border border-slate-100"
      />
      <StatCard
        label="Đang chờ"
        value={stats.pending}
        icon={ClockIcon}
        accent="bg-white text-amber-500 shadow-sm border border-slate-100"
      />
      <StatCard
        label="Thất bại"
        value={stats.failed}
        icon={XCircleIcon}
        accent="bg-white text-rose-500 shadow-sm border border-slate-100"
      />
    </div>
  );
}
