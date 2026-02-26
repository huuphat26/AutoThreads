// PostCard — một bài đăng trong lịch sử
import type { ScheduledPost } from "@/types";
import { TOPIC_LABELS, STATUS_CONFIG } from "@/lib/constants";

type Props = { post: ScheduledPost };

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
      message: (code && friendly[code]) ?? truncate(message, 120),
    };
  } catch {
    // Plain string fallback
    return { message: truncate(raw, 120) };
  }
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max).trimEnd() + "…" : str;
}

export function PostCard({ post }: Props) {
  const st = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = st.icon;

  const displayTime = post.postedAt
    ? new Date(post.postedAt).toLocaleString("vi-VN")
    : new Date(post.scheduledAt).toLocaleString("vi-VN");

  const parsedError = post.errorMessage
    ? parseErrorMessage(post.errorMessage)
    : null;

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

      {post.threadsPostId && (
        <p className="text-xs text-slate-300 mt-2">ID: {post.threadsPostId}</p>
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
