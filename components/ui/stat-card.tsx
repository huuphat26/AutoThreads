import type { FC } from "react";

type StatCardProps = {
  label: string;
  value: number;
  icon: FC<{ className?: string }>;
  accent: string;
};

export function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-xl font-semibold text-slate-700">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}
