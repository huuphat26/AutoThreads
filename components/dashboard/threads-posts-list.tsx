// ThreadsPostsList — danh sách bài đăng kéo trực tiếp từ Threads API
// Auto-load on mount · insights mỗi bài · xem thêm dần từng bước
"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import type { ThreadsPost, ThreadsMediaInsights } from "@/types";
import { RefreshIcon, DocumentIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

const STEP = 5; // số bài hiện thêm mỗi lần nhấn "xem thêm"

// ─── Props ─────────────────────────────────────────────────────
type Props = {
  posts: ThreadsPost[];
  total: number;
  loading: boolean;
  error: string;
  onFetch: () => void;
};

// ─── Helpers ───────────────────────────────────────────────────
function formatTimestamp(ts?: string): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── InsightBadge ──────────────────────────────────────────────
function InsightBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="text-sm font-bold text-slate-700 leading-none">
        {fmtNum(value)}
      </span>
      <span className="text-[10px] text-slate-400 leading-none">{label}</span>
    </div>
  );
}

// ─── ThreadsPostItem ───────────────────────────────────────────
function ThreadsPostItem({ post }: { post: ThreadsPost }) {
  const [insights, setInsights] = useState<ThreadsMediaInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsFailed, setInsightsFailed] = useState(false);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsFailed(false);
    try {
      const res = await fetch(`/api/threads/post/${post.id}?detail=true`);
      const json = await res.json();
      if (json.success && json.data?.insights) {
        setInsights(json.data.insights as ThreadsMediaInsights);
      } else {
        setInsightsFailed(true);
      }
    } catch {
      setInsightsFailed(true);
    } finally {
      setInsightsLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    if (!post.id) return;
    let active = true;
    axios
      .get<{ success: boolean; data: ThreadsMediaInsights }>(
        `/api/threads/post/${post.id}`,
      )
      .then((res) => {
        if (!active) return;
        if (res.data.success) {
          setInsights(res.data.data);
        } else {
          setInsightsFailed(true);
        }
      })
      .catch(() => {
        if (active) setInsightsFailed(true);
      })
      .finally(() => {
        if (active) setInsightsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [post.id]);

  const mediaIcon =
    post.media_type === "IMAGE"
      ? "🖼"
      : post.media_type === "VIDEO"
        ? "🎬"
        : post.media_type === "CAROUSEL"
          ? "📸"
          : "📝";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-base leading-none">{mediaIcon}</span>
          <span className="text-xs text-slate-400">
            {formatTimestamp(post.timestamp)}
          </span>
          <span className="text-xs font-mono text-slate-300">
            #{post.id.slice(-8)}
          </span>
        </div>
        {post.permalink && (
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:text-indigo-700 underline shrink-0"
          >
            Xem bài →
          </a>
        )}
      </div>

      {/* Nội dung */}
      <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
        {post.text || (
          <span className="italic text-slate-400">Không có nội dung</span>
        )}
      </p>

      {/* Thumbnail */}
      {post.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnail_url}
          alt="thumbnail"
          className="mt-2 rounded-xl max-h-32 object-cover"
        />
      )}

      {/* Insights */}
      <div className="mt-3 pt-3 border-t border-slate-100 min-h-10 flex items-center">
        {insightsLoading && (
          <Spinner className="w-3.5 h-3.5 text-slate-300 mx-auto" />
        )}
        {!insightsLoading && insights && (
          <div className="flex items-center justify-between w-full">
            <InsightBadge label="Views" value={insights.views} />
            <InsightBadge label="Likes" value={insights.likes} />
            <InsightBadge label="Replies" value={insights.replies} />
            <InsightBadge label="Reposts" value={insights.reposts} />
            <InsightBadge label="Quotes" value={insights.quotes} />
          </div>
        )}
        {!insightsLoading && insightsFailed && (
          <button
            onClick={fetchInsights}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Thử lại insights
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ThreadsPostsList ──────────────────────────────────────────
export function ThreadsPostsList({
  posts,
  total,
  loading,
  error,
  onFetch,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(STEP);

  // Auto-load khi component mount lần đầu
  useEffect(() => {
    onFetch();
  }, [onFetch]);

  const [prevLength, setPrevLength] = useState(posts.length);
  if (posts.length !== prevLength) {
    setPrevLength(posts.length);
    if (posts.length > 0) {
      setVisibleCount(STEP);
    }
  }

  const visible = posts.slice(0, visibleCount);
  const remaining = posts.length - visibleCount;

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Bài đăng trên Threads
          </h2>
          {total > 0 && !loading && (
            <p className="text-xs text-slate-400 mt-0.5">{total} bài</p>
          )}
        </div>
        <button
          onClick={onFetch}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
        >
          {loading ? <Spinner className="w-3.5 h-3.5" /> : <RefreshIcon />}
          Làm mới
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 mb-3">
          {error}
        </div>
      )}

      {/* Skeleton khi đang tải (chưa có data) */}
      {loading && posts.length === 0 && (
        <div className="space-y-2.5">
          {Array.from({ length: STEP }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse"
            >
              <div className="flex gap-2 mb-3">
                <div className="w-5 h-5 bg-slate-100 rounded shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-50">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-14 bg-slate-50 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trống sau khi load */}
      {!loading && posts.length === 0 && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <DocumentIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">Chưa có bài đăng nào</p>
        </div>
      )}

      {/* Danh sách bài */}
      {posts.length > 0 && (
        <>
          <div className="space-y-2.5">
            {visible.map((post) => (
              <ThreadsPostItem key={post.id} post={post} />
            ))}
          </div>

          {/* Xem thêm — hiện dần STEP bài */}
          {remaining > 0 && (
            <button
              onClick={() => setVisibleCount((c) => c + STEP)}
              className="mt-2 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1.5 rounded-xl border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            >
              Xem thêm {Math.min(remaining, STEP)} bài
              <span className="text-slate-300 ml-1.5">
                ({remaining} còn lại)
              </span>
            </button>
          )}

          {remaining <= 0 && posts.length > STEP && (
            <p className="mt-2 text-center text-xs text-slate-300">
              Đã hiển thị hết {posts.length} bài
            </p>
          )}
        </>
      )}
    </section>
  );
}
