// ============================================================
// FacebookPostsList — Danh sách bài đăng FB (đã đăng + hẹn giờ)
// ============================================================
"use client";

import { RefreshIcon, TrashIcon, ClockIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { FBScheduledPost, FBPostStatus } from "@/types";
import type { FBDashboardStats } from "@/hooks/use-facebook-dashboard";

type Props = {
  posts: FBScheduledPost[];
  stats: FBDashboardStats;
  loading: boolean;
  error: string;
  onFetch: () => void;
  onCancel: (id: string) => void;
};

function StatusBadge({ status }: { status: FBPostStatus }) {
  const map: Record<
    FBPostStatus,
    { label: string; classes: string; dot: string }
  > = {
    scheduled: {
      label: "Hẹn giờ",
      classes: "bg-blue-50 text-blue-600 border-blue-200",
      dot: "bg-blue-500",
    },
    pending: {
      label: "Đang đăng",
      classes: "bg-amber-50 text-amber-600 border-amber-200",
      dot: "bg-amber-500",
    },
    posted: {
      label: "Đã đăng",
      classes: "bg-emerald-50 text-emerald-600 border-emerald-200",
      dot: "bg-emerald-500",
    },
    failed: {
      label: "Thất bại",
      classes: "bg-rose-50 text-rose-600 border-rose-200",
      dot: "bg-rose-500",
    },
    cancelled: {
      label: "Đã hủy",
      classes: "bg-slate-100 text-slate-400 border-slate-200",
      dot: "bg-slate-400",
    },
  };

  const { label, classes, dot } = map[status] ?? map.cancelled;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function PostCard({
  post,
  onCancel,
}: {
  post: FBScheduledPost;
  onCancel: (id: string) => void;
}) {
  const canCancel = post.status === "scheduled" || post.status === "pending";

  const scheduledDate = new Date(post.scheduledAt);
  const dateStr = scheduledDate.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2.5 hover:border-slate-200 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={post.status} />
          {post.mediaType === "IMAGE" && (
            <span className="text-[10px] text-blue-500 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
              🖼️ Ảnh
            </span>
          )}
        </div>

        {canCancel && (
          <button
            onClick={() => onCancel(post.id)}
            title="Hủy bài"
            className="text-slate-300 hover:text-rose-500 transition-colors shrink-0"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Message preview */}
      {post.message && (
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
          {post.message}
        </p>
      )}

      {/* Image preview */}
      {post.mediaType === "IMAGE" && post.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 max-h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt="preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {post.status === "posted" && post.postedAt
            ? `Đã đăng ${new Date(post.postedAt).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : post.status === "scheduled"
              ? `Hẹn lúc ${dateStr}`
              : dateStr}
        </span>

        {post.fbPermalinkUrl && (
          <a
            href={post.fbPermalinkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[#1877F2] hover:underline font-medium"
          >
            Xem bài →
          </a>
        )}
      </div>

      {/* Error message */}
      {post.status === "failed" && post.errorMessage && (
        <p className="text-[10px] text-rose-500 bg-rose-50 rounded-lg px-2 py-1.5 leading-relaxed">
          {post.errorMessage}
        </p>
      )}
    </div>
  );
}

export function FacebookPostsList({
  posts,
  stats,
  loading,
  error,
  onFetch,
  onCancel,
}: Props) {
  return (
    <section className="pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Bài đăng Facebook
        </h3>
        <button
          onClick={onFetch}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Spinner className="w-3 h-3" />
          ) : (
            <RefreshIcon className="w-3 h-3" />
          )}
          Làm mới
        </button>
      </div>

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {[
            {
              label: "Hẹn giờ",
              value: stats.scheduled,
              color: "text-blue-600",
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

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mb-3">
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-slate-400 font-medium">
            Chưa có bài đăng nào
          </p>
          <p className="text-xs text-slate-300 mt-1">
            Tạo bài đăng đầu tiên ở trên
          </p>
        </div>
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onCancel={onCancel} />
          ))}
        </div>
      )}
    </section>
  );
}
