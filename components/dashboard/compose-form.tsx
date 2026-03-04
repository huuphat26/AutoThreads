"use client";

import {
  SparklesIcon,
  SendIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { ThreadsManualMediaType } from "@/types";

type Props = {
  content: string;
  keywords: string;
  generating: boolean;
  loading: boolean;
  error: string;
  success: string;
  mediaType?: ThreadsManualMediaType;
  imageUrl?: string;
  isScheduled?: boolean;
  scheduledTime?: string;
  onContentChange: (v: string) => void;
  onKeywordsChange: (v: string) => void;
  onMediaTypeChange?: (v: ThreadsManualMediaType) => void;
  onImageUrlChange?: (v: string) => void;
  onIsScheduledChange?: (v: boolean) => void;
  onScheduledTimeChange?: (v: string) => void;
  onGenerate: () => void;
  onPost: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent";

export function ComposeForm({
  content,
  generating,
  loading,
  error,
  success,
  mediaType = "TEXT",
  imageUrl = "",
  isScheduled = false,
  scheduledTime = "",
  onContentChange,
  onIsScheduledChange,
  onScheduledTimeChange,
  onGenerate,
  onPost,
}: Props) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-50 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-800">
            Tạo & Đăng bài
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            AI soạn sẵn — chỉnh sửa rồi đăng
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap shrink-0"
        >
          {generating ? <Spinner /> : <SparklesIcon />}
          {generating ? "Đang tạo..." : "Tạo bằng AI"}
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">
              {mediaType === "IMAGE" ? "Caption (tùy chọn)" : "Nội dung"}
            </label>
            <span className="text-xs text-slate-300">
              {content.length} ký tự
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={mediaType === "IMAGE" ? 4 : 7}
            placeholder={
              mediaType === "IMAGE"
                ? "Nhập caption cho ảnh (tùy chọn)..."
                : 'Nhấn "Tạo bằng AI" để tự động tạo nội dung, hoặc nhập thủ công...'
            }
            className={`${inputClass} resize-none leading-relaxed`}
          />
        </div>

        {onIsScheduledChange && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  Hẹn giờ đăng
                </span>
              </div>
              <button
                type="button"
                onClick={() => onIsScheduledChange?.(!isScheduled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  isScheduled ? "bg-slate-800" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    isScheduled ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {isScheduled && (
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Thời điểm đăng
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => onScheduledTimeChange?.(e.target.value)}
                  className={inputClass}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Server sẽ tự động đăng bài vào thời điểm đã chọn (kiểm tra mỗi
                  phút).
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
            <XCircleIcon />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl">
            <CheckCircleIcon />
            <span>{success}</span>
          </div>
        )}

        <button
          onClick={onPost}
          disabled={
            loading ||
            (mediaType === "IMAGE" ? !imageUrl?.trim() : !content.trim())
          }
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? <Spinner /> : isScheduled ? <ClockIcon /> : <SendIcon />}
          {loading
            ? isScheduled
              ? "Đang lưu lịch..."
              : "Đang đăng..."
            : isScheduled
              ? "Hẹn lịch đăng"
              : mediaType === "IMAGE"
                ? "Đăng ảnh lên Threads"
                : "Đăng lên Threads"}
        </button>
      </div>
    </section>
  );
}
