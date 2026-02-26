// HistoryList — danh sách lịch sử bài đăng (nhóm theo ngày)
"use client";

import { useState, useMemo } from "react";
import type { ScheduledPost } from "@/types";
import { PostCard } from "./post-card";
import { RefreshIcon, DocumentIcon } from "@/components/ui/icons";

const INITIAL_PER_DAY = 3;

type Props = {
  posts: ScheduledPost[];
  onRefresh: () => void;
};

function formatDayLabel(dateKey: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (dateKey === toKey(today)) return "Hôm nay";
  if (dateKey === toKey(yesterday)) return "Hôm qua";

  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

function getDateKey(post: ScheduledPost): string {
  const raw = post.postedAt ?? post.scheduledAt;
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HistoryList({ posts, onRefresh }: Props) {
  // dateKey → expanded state
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const sorted = [...posts].sort((a, b) => {
      const ta = new Date(a.postedAt ?? a.scheduledAt).getTime();
      const tb = new Date(b.postedAt ?? b.scheduledAt).getTime();
      return tb - ta; // newest first
    });

    const map = new Map<string, ScheduledPost[]>();
    for (const post of sorted) {
      const key = getDateKey(post);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return Array.from(map.entries()); // [[dateKey, posts[]], ...]
  }, [posts]);

  const toggleDay = (key: string) =>
    setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Lịch sử bài đăng
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RefreshIcon />
          Làm mới
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <DocumentIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">
            Chưa có bài nào được đăng — hãy tạo bài đầu tiên!
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([dateKey, dayPosts]) => {
            const isExpanded = !!expandedDays[dateKey];
            const visible = isExpanded
              ? dayPosts
              : dayPosts.slice(0, INITIAL_PER_DAY);
            const hidden = dayPosts.length - visible.length;

            return (
              <div key={dateKey}>
                {/* Day header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {formatDayLabel(dateKey)}
                  </span>
                  <span className="text-xs text-slate-300">
                    ({dayPosts.length} bài)
                  </span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Posts for this day */}
                <div className="space-y-2.5">
                  {visible.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Xem thêm / Thu gọn */}
                {dayPosts.length > INITIAL_PER_DAY && (
                  <button
                    onClick={() => toggleDay(dateKey)}
                    className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1.5 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  >
                    {isExpanded ? "Thu gọn" : `Xem thêm ${hidden} bài`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
