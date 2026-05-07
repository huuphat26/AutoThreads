// ============================================================
// InstagramComposeForm — Compose form tạo & đăng/hẹn lịch bài Instagram
//
// Đặc điểm so với Facebook/Threads:
//  - Không có text-only → bắt buộc ảnh (IMAGE) hoặc video (REELS)
//  - AI tạo caption/hashtag gắn vào media
//  - REELS có tùy chọn "Chia sẻ lên Feed"
//  - Hẹn giờ hoạt động giống Facebook (scheduler mỗi phút)
// ============================================================
"use client";

import {
  SendIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { IGScheduleMediaType } from "@/types";

type Props = {
  keywords: string;
  caption: string;
  mediaType: IGScheduleMediaType;
  imageUrl: string;
  videoUrl: string;
  shareToFeed: boolean;
  isScheduled: boolean;
  scheduledTime: string;
  generating: boolean;
  loading: boolean;
  error: string;
  success: string;

  onKeywordsChange: (v: string) => void;
  onCaptionChange: (v: string) => void;
  onMediaTypeChange: (v: IGScheduleMediaType) => void;
  onImageUrlChange: (v: string) => void;
  onVideoUrlChange: (v: string) => void;
  onShareToFeedChange: (v: boolean) => void;
  onIsScheduledChange: (v: boolean) => void;
  onScheduledTimeChange: (v: string) => void;
  onGenerate: () => void;
  onPost: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-transparent";

const igGradient = "from-purple-600 via-pink-500 to-orange-400";

export function InstagramComposeForm({
  caption,
  mediaType,
  imageUrl,
  videoUrl,
  shareToFeed,
  isScheduled,
  scheduledTime,
  loading,
  error,
  success,
  onCaptionChange,
  onMediaTypeChange,
  onImageUrlChange,
  onVideoUrlChange,
  onShareToFeedChange,
  onIsScheduledChange,
  onScheduledTimeChange,
  onPost,
}: Props) {
  const mediaReady =
    mediaType === "IMAGE" ? !!imageUrl.trim() : !!videoUrl.trim();
  const canPost = !loading && mediaReady;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-50 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Tạo & Đăng bài Instagram
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Soạn caption và đăng ngay
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-2">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">
            Loại media
          </label>
          <div className="flex gap-2">
            {(["IMAGE", "REELS"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onMediaTypeChange(type)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
                  mediaType === type
                    ? `bg-linear-to-r ${igGradient} text-white border-transparent`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {type === "IMAGE" ? "🖼️ Ảnh" : "🎬 Reels"}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Instagram không hỗ trợ đăng văn bản thuần — phải kèm ảnh hoặc video.
          </p>
        </div>

        {/* Image URL */}
        {mediaType === "IMAGE" && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              URL hình ảnh{" "}
              <span className="text-rose-400 font-semibold">*</span>
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => onImageUrlChange(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className={inputClass}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              JPEG hoặc PNG, tỉ lệ 1:1 / 4:5 / 1.91:1. URL phải công khai HTTPS.
            </p>
            {imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full max-h-52 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Video URL */}
        {mediaType === "REELS" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                URL video <span className="text-rose-400 font-semibold">*</span>
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => onVideoUrlChange(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className={inputClass}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                MP4 (H.264), tỉ lệ 9:16, thời lượng 3–90 giây. URL phải công
                khai.
              </p>
            </div>

            {/* Share to Feed toggle */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
              <span className="text-sm text-slate-700">
                Chia sẻ Reels lên Feed
              </span>
              <button
                type="button"
                onClick={() => onShareToFeedChange(!shareToFeed)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  shareToFeed ? `bg-linear-to-r ${igGradient}` : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    shareToFeed ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">
              Caption & Hashtag
            </label>
            <span className="text-xs text-slate-300">
              {caption.length} / 2200 ký tự
            </span>
          </div>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            rows={6}
            maxLength={2200}
            placeholder="Nhập caption cho bài đăng (tối đa 2200 ký tự)..."
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
            <button
              type="button"
              onClick={() => onIsScheduledChange(!isScheduled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                isScheduled ? `bg-linear-to-r ${igGradient}` : "bg-slate-300"
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
                Server tự động publish vào thời điểm đã chọn (kiểm tra mỗi
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
          className={`w-full flex items-center justify-center gap-2 bg-linear-to-r ${igGradient} text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-sm`}
        >
          {loading ? <Spinner /> : isScheduled ? <ClockIcon /> : <SendIcon />}
          {loading
            ? isScheduled
              ? "Đang lưu lịch..."
              : "Đang đăng..."
            : isScheduled
              ? "Hẹn lịch đăng"
              : mediaType === "REELS"
                ? "Đăng Reels lên Instagram"
                : "Đăng ảnh lên Instagram"}
        </button>
      </div>
    </section>
  );
}
