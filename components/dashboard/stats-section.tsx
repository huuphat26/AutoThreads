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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Hệ thống giám sát
        </h2>
        <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
            AI Active
          </span>
        </div>
      </div>

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
    </section>
  );
}
