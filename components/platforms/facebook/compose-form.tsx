"use client";

import {
  SendIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { FBMediaType } from "@/types";

type Props = {
  keywords: string;
  content: string;
  mediaType: FBMediaType;
  imageUrl: string;
  isScheduled: boolean;
  scheduledTime: string;
  generating: boolean;
  loading: boolean;
  error: string;
  success: string;

  onKeywordsChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onMediaTypeChange: (v: FBMediaType) => void;
  onImageUrlChange: (v: string) => void;
  onIsScheduledChange: (v: boolean) => void;
  onScheduledTimeChange: (v: string) => void;
  onGenerate: () => void;
  onPost: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent";

export function FacebookComposeForm({
  content,
  mediaType,
  imageUrl,
  isScheduled,
  scheduledTime,
  loading,
  error,
  success,
  onContentChange,
  onIsScheduledChange,
  onScheduledTimeChange,
  onGenerate,
  onPost,
}: Props) {
  const canPost =
    !loading && (mediaType === "IMAGE" ? !!imageUrl.trim() : !!content.trim());

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-slate-50 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Tạo & Đăng bài Facebook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Soạn nội dung và đăng ngay
          </p>
        </div>
      </div>

      <div className="px-6 py-2 space-y-2">
        <div>
          <div className="flex items-center justify-between py-2">
            <label className="text-xs font-medium text-slate-500">
              {mediaType === "IMAGE" ? "Caption" : "Nội dung bài đăng"}
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
                : "Nhập nội dung bài đăng..."
            }
            className={`${inputClass} resize-none leading-relaxed`}
          />
        </div>

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
              onClick={() => onIsScheduledChange(!isScheduled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                isScheduled ? "bg-[#1877F2]" : "bg-slate-300"
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
                onChange={(e) => onScheduledTimeChange(e.target.value)}
                className={inputClass}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Server sẽ tự động đăng bài vào thời điểm đã chọn (kiểm tra mỗi
                phút).
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
            <XCircleIcon />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2.5 rounded-xl">
            <CheckCircleIcon />
            <span>{success}</span>
          </div>
        )}

        {/* Post button */}
        <button
          onClick={onPost}
          disabled={!canPost}
          className="w-full flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1259C3] text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? <Spinner /> : isScheduled ? <ClockIcon /> : <SendIcon />}
          {loading
            ? isScheduled
              ? "Đang lưu lịch..."
              : "Đang đăng..."
            : isScheduled
              ? "Hẹn lịch đăng"
              : mediaType === "IMAGE"
                ? "Đăng ảnh lên Facebook"
                : "Đăng lên Facebook"}
        </button>
      </div>
    </section>
  );
}
