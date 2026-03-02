// ============================================================
// FacebookComposeForm — Compose form tạo & đăng/hẹn lịch bài trên Facebook
// Tương tự ComposeForm của Threads nhưng có thêm:
//  - Tùy chọn đăng ngay vs hẹn giờ cụ thể
//  - Hỗ trợ ảnh (IMAGE) qua URL công khai
// ============================================================
"use client";

import {
  SparklesIcon,
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
  keywords,
  content,
  mediaType,
  imageUrl,
  isScheduled,
  scheduledTime,
  generating,
  loading,
  error,
  success,
  onKeywordsChange,
  onContentChange,
  onMediaTypeChange,
  onImageUrlChange,
  onIsScheduledChange,
  onScheduledTimeChange,
  onGenerate,
  onPost,
}: Props) {
  const canPost =
    !loading && (mediaType === "IMAGE" ? !!imageUrl.trim() : !!content.trim());

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-50 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Tạo & Đăng bài Facebook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            AI soạn nội dung — đăng ngay hoặc hẹn giờ
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1259C3] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap shrink-0"
        >
          {generating ? <Spinner /> : <SparklesIcon />}
          {generating ? "Đang tạo..." : "Tạo bằng AI"}
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Keywords */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Từ khóa (cách nhau bằng dấu phẩy)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            placeholder="vd: Facebook Marketing, quảng cáo, thương hiệu"
            className={inputClass}
          />
        </div>

        {/* Media Type */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Loại bài đăng
          </label>
          <div className="flex gap-2">
            {(["TEXT", "IMAGE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onMediaTypeChange(type)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  mediaType === type
                    ? "bg-[#1877F2] text-white border-[#1877F2]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {type === "TEXT" ? "📝 Chỉ văn bản" : "🖼️ Có hình ảnh"}
              </button>
            ))}
          </div>
        </div>

        {/* Image URL — chỉ hiện khi IMAGE */}
        {mediaType === "IMAGE" && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              URL hình ảnh (công khai, HTTPS)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => onImageUrlChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Hỗ trợ JPEG, PNG. URL phải truy cập được công khai.
            </p>
            {imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full max-h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Content / Caption */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
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
                : 'Nhấn "Tạo bằng AI" hoặc nhập nội dung thủ công...'
            }
            className={`${inputClass} resize-none leading-relaxed`}
          />
        </div>

        {/* Schedule toggle */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                Hẹn giờ đăng
              </span>
            </div>
            {/* Toggle switch */}
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
                // min is not set to avoid impure render — validation handled in hook
                className={inputClass}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Server sẽ tự động đăng bài vào thời điểm đã chọn (kiểm tra mỗi
                phút).
              </p>
            </div>
          )}
        </div>

        {/* Error / Success */}
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
