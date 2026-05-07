import { ContentPoolItem } from "@/types";
import { PoolStats } from "./use-content-pool";
import { StatsBarSkeleton } from "./pool-skeleton";

interface Props {
  stats: PoolStats | undefined;
  allPending: ContentPoolItem[];
  todayVN: string;
  loading: boolean;
}

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(diff / 86_400_000);
  return `${days} ngày trước`;
}

export function PoolStatsBar({ stats, allPending, todayVN, loading }: Props) {
  if (loading && !stats) return <StatsBarSkeleton />;
  if (!stats) return null;

  const todayItems = allPending.filter((i) => i.date === todayVN);
  const eveningCount = todayItems.filter((i) => i.slot === "evening").length;

  const cards = [
    {
      value: stats.total,
      label: "Tổng bài",
      sub: `${stats.pending} đang chờ · ${stats.used} đã dùng`,
      valueClass: "text-slate-800",
      subClass: "text-slate-400",
    },
    {
      value: todayItems.length,
      label: "Hôm nay",
      sub:
        todayItems.length > 0
          ? `Slot buổi tối: ${eveningCount} bài`
          : "Không có bài hôm nay",
      valueClass: todayItems.length > 0 ? "text-blue-600" : "text-slate-400",
      subClass: "text-slate-400",
    },

    {
      value: null,
      label: "Cập nhật",
      sub: formatRelativeDate(stats.lastUpdated),
      valueClass: "text-slate-500",
      subClass: "text-slate-400",
      rawValue: new Date(stats.lastUpdated).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-slate-100 px-3 py-3 flex flex-col gap-0.5"
        >
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            {card.label}
          </p>
          {card.rawValue !== undefined ? (
            <p className={`text-sm font-bold leading-tight ${card.valueClass}`}>
              {card.rawValue}
            </p>
          ) : (
            <p className={`text-2xl font-bold leading-tight ${card.valueClass}`}>
              {card.value}
            </p>
          )}
          <p className={`text-[10px] leading-tight ${card.subClass}`}>{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
