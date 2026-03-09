"use client";

import type { IGScheduledPost } from "@/types";
import type { IGDashboardStats } from "@/hooks/use-instagram-dashboard";

type Props = {
  posts: IGScheduledPost[];
  stats: IGDashboardStats;
  loading: boolean;
  error: string;
  onFetch: () => void;
  onCancel: (id: string) => void;
};

export function InstagramPostsList({ stats }: Props) {
  return (
    <section className="pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Bài đăng Instagram
        </h3>
      </div>

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
          {[
            {
              label: "Hẹn giờ",
              value: stats.scheduled,
              color: "text-purple-600",
            },
            {
              label: "Đã đăng",
              value: stats.posted,
              color: "text-emerald-600",
            },
            { label: "Thất bại", value: stats.failed, color: "text-rose-600" },
            { label: "Tổng", value: stats.total, color: "text-slate-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-50 rounded-xl px-2 py-2 text-center"
            >
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
