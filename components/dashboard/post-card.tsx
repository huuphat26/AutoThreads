// PostCard — một bài đăng trong lịch sử
import type { ScheduledPost } from "@/types";
import { SLOT_LABELS, TOPIC_LABELS, STATUS_CONFIG } from "@/lib/constants";

type Props = { post: ScheduledPost };

export function PostCard({ post }: Props) {
  const st = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = st.icon;

  const displayTime = post.postedAt
    ? new Date(post.postedAt).toLocaleString("vi-VN")
    : new Date(post.scheduledAt).toLocaleString("vi-VN");

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
            {SLOT_LABELS[post.slot]?.label}
          </span>
          <span className="text-xs text-slate-300">
            {TOPIC_LABELS[post.topic]}
          </span>
        </div>
        <span className="text-xs text-slate-300 whitespace-nowrap shrink-0">
          {displayTime}
        </span>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
        {post.content}
      </p>

      {post.threadsPostId && (
        <p className="text-xs text-slate-300 mt-2">ID: {post.threadsPostId}</p>
      )}
      {post.errorMessage && (
        <p className="text-xs text-rose-400 mt-2 bg-rose-50 px-2 py-1 rounded-lg">
          Lỗi: {post.errorMessage}
        </p>
      )}
    </div>
  );
}
