// PostCard — một bài đăng trong lịch sử (có insights)
"use client";

import { useState, useCallback, useEffect } from "react";
import type { ScheduledPost, ThreadsMediaInsights } from "@/types";
import { TOPIC_LABELS, STATUS_CONFIG } from "@/lib/constants";
import { TrashIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

type Props = { post: ScheduledPost; onDelete?: () => void };

type ParsedError = { code?: number; message: string };

function parseErrorMessage(raw: string): ParsedError {
  // Try to extract from JSON error envelope
  try {
    const outer = JSON.parse(raw) as {
      error?: { code?: number; message?: string };
      message?: string;
      code?: number;
    };
    const err = outer?.error ?? outer;
    const code = err?.code;
    const message = err?.message ?? raw;

    // Map common error codes to friendly Vietnamese messages
    const friendly: Record<number, string> = {
      429: "Đã vượt hạn mức API — thử lại sau ít phút.",
      503: "Dịch vụ AI đang quá tải — thử lại sau.",
      500: "Lỗi máy chủ nội bộ — thử lại sau.",
      401: "Token không hợp lệ hoặc đã hết hạn.",
      403: "Không có quyền thực hiện hành động này.",
    };

    return {
      code,
      message: (code ? friendly[code] : undefined) ?? truncate(message, 120),
    };
  } catch {
    // Plain string fallback
    return { message: truncate(raw, 120) };
  }
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max).trimEnd() + "…" : str;
}

export function PostCard({ post, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [insights, setInsights] = useState<ThreadsMediaInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const st = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = st.icon;

  const displayTime = post.postedAt
    ? new Date(post.postedAt).toLocaleString("vi-VN")
    : new Date(post.scheduledAt).toLocaleString("vi-VN");

  const parsedError = post.errorMessage
    ? parseErrorMessage(post.errorMessage)
    : null;

  const canShowInsights = post.status === "posted" && !!post.threadsPostId;

  const fetchInsights = useCallback(async () => {
    if (!post.threadsPostId) return;
    setInsightsLoading(true);
    try {
      const res = await fetch(
        `/api/threads/post/${post.threadsPostId}?detail=true`,
      );
      const json = await res.json();
      if (json.success && json.data?.insights) {
        setInsights(json.data.insights);
      }
    } catch {
    } finally {
      setInsightsLoading(false);
    }
  }, [post.threadsPostId]);

  useEffect(() => {
    if (canShowInsights) fetchInsights();
  }, [canShowInsights, fetchInsights]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.colorClass}`}
          >
            <StatusIcon className="w-3 h-3" />
            {st.label}
          </span>
          <span className="text-xs text-slate-300">
            {post.topicLabel ?? TOPIC_LABELS[post.topic]}
          </span>
        </div>
        <span className="text-xs text-slate-300 whitespace-nowrap shrink-0">
          {displayTime}
        </span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
        {post.content}
      </p>

      <div className="flex items-center justify-between mt-2.5 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {post.threadsPostId && (
            <p className="text-xs text-slate-300 truncate">
              ID: {post.threadsPostId}
            </p>
          )}
        </div>

        {/* Nút xóa */}
        {onDelete && (
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {confirming ? (
              <>
                <span className="text-xs text-rose-500">Xóa bài này?</span>
                <button
                  onClick={() => {
                    setConfirming(false);
                    onDelete();
                  }}
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-xs px-2 py-0.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="text-slate-300 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-rose-50"
                title="Xóa bài"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Insights — tự động hiển thị */}
      {canShowInsights && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          {insightsLoading && !insights && (
            <div className="flex items-center justify-center py-2">
              <Spinner />
            </div>
          )}
          {insights && (
            <div className="grid grid-cols-5 gap-1.5">
              <InsightBadge label="Views" value={insights.views} />
              <InsightBadge label="Likes" value={insights.likes} />
              <InsightBadge label="Replies" value={insights.replies} />
              <InsightBadge label="Reposts" value={insights.reposts} />
              <InsightBadge label="Quotes" value={insights.quotes} />
            </div>
          )}
        </div>
      )}

      {parsedError && (
        <div className="mt-2.5 flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          <span className="mt-px text-rose-400 shrink-0">⚠</span>
          <div className="min-w-0">
            {parsedError.code && (
              <span className="text-xs font-semibold text-rose-400 mr-1.5">
                [{parsedError.code}]
              </span>
            )}
            <span className="text-xs text-rose-500">{parsedError.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Badge nhỏ hiển thị một metric */
function InsightBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-slate-50 rounded-xl py-2 px-1">
      <span className="text-sm font-semibold text-slate-700">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-[9px] text-slate-400 leading-none">{label}</span>
    </div>
  );
}
