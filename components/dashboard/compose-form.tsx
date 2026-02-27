// ComposeForm — khu vực tạo & đăng bài (hỗ trợ text + image)
"use client";

import { TOPICS } from "@/lib/topics";
import {
  SparklesIcon,
  SendIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { ThreadsMediaType } from "@/types";

type Props = {
  topic: string;
  content: string;
  keywords: string;
  generating: boolean;
  loading: boolean;
  error: string;
  success: string;
  mediaType?: ThreadsMediaType;
  imageUrl?: string;
  onTopicChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onKeywordsChange: (v: string) => void;
  onMediaTypeChange?: (v: ThreadsMediaType) => void;
  onImageUrlChange?: (v: string) => void;
  onGenerate: () => void;
  onPost: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent";

export function ComposeForm({
  topic,
  content,
  keywords,
  generating,
  loading,
  error,
  success,
  mediaType = "TEXT",
  imageUrl = "",
  onTopicChange,
  onContentChange,
  onKeywordsChange,
  onMediaTypeChange,
  onImageUrlChange,
  onGenerate,
  onPost,
}: Props) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header card */}
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

      <div className="px-6 py-5 space-y-4">
        {/* Topic */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Chủ đề
          </label>
          <select
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            className={inputClass}
          >
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Keywords */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Từ khóa (cách nhau bằng dấu phẩy)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => onKeywordsChange(e.target.value)}
            placeholder="vd: nước ép detox, giảm cân, thanh lọc cơ thể"
            className={inputClass}
          />
        </div>

        {/* Media Type selector */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Loại bài đăng
          </label>
          <div className="flex gap-2">
            {(["TEXT", "IMAGE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onMediaTypeChange?.(type)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  mediaType === type
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {type === "TEXT" ? "📝 Chỉ văn bản" : "🖼️ Có hình ảnh"}
              </button>
            ))}
          </div>
        </div>

        {/* Image URL input — chỉ hiện khi chọn IMAGE */}
        {mediaType === "IMAGE" && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              URL hình ảnh (công khai, HTTPS)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => onImageUrlChange?.(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Hỗ trợ JPEG, PNG, WebP. URL phải truy cập được công khai.
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

        {/* Content textarea */}
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

        {/* Error / Success messages */}
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

        {/* Post button */}
        <button
          onClick={onPost}
          disabled={
            loading ||
            (mediaType === "IMAGE" ? !imageUrl?.trim() : !content.trim())
          }
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? <Spinner /> : <SendIcon />}
          {loading
            ? "Đang đăng..."
            : mediaType === "IMAGE"
              ? "Đăng ảnh lên Threads"
              : "Đăng lên Threads"}
        </button>
      </div>
    </section>
  );
}
