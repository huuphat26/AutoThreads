// ComposeForm — khu vực tạo & đăng bài
"use client";

import type { PostSlot, ContentTopic } from "@/types";
import { SLOT_LABELS, TOPIC_LABELS } from "@/lib/constants";
import {
  SparklesIcon,
  SendIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  slot: PostSlot;
  topic: ContentTopic;
  content: string;
  keywords: string;
  generating: boolean;
  loading: boolean;
  error: string;
  success: string;
  onSlotChange: (v: PostSlot) => void;
  onTopicChange: (v: ContentTopic) => void;
  onContentChange: (v: string) => void;
  onKeywordsChange: (v: string) => void;
  onGenerate: () => void;
  onPost: () => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent";

export function ComposeForm({
  slot,
  topic,
  content,
  keywords,
  generating,
  loading,
  error,
  success,
  onSlotChange,
  onTopicChange,
  onContentChange,
  onKeywordsChange,
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
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap flex-shrink-0"
        >
          {generating ? <Spinner /> : <SparklesIcon />}
          {generating ? "Đang tạo..." : "Tạo bằng AI"}
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Slot + Topic */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Khung giờ
            </label>
            <select
              value={slot}
              onChange={(e) => onSlotChange(e.target.value as PostSlot)}
              className={inputClass}
            >
              {(
                Object.entries(SLOT_LABELS) as [PostSlot, { label: string }][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Chủ đề
            </label>
            <select
              value={topic}
              onChange={(e) => onTopicChange(e.target.value as ContentTopic)}
              className={inputClass}
            >
              {(Object.entries(TOPIC_LABELS) as [ContentTopic, string][]).map(
                ([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ),
              )}
            </select>
          </div>
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

        {/* Content textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">
              Nội dung
            </label>
            <span className="text-xs text-slate-300">
              {content.length} ký tự
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={7}
            placeholder='Nhấn "Tạo bằng AI" để tự động tạo nội dung, hoặc nhập thủ công...'
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
          disabled={loading || !content.trim()}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {loading ? <Spinner /> : <SendIcon />}
          {loading ? "Đang đăng..." : "Đăng lên Threads"}
        </button>
      </div>
    </section>
  );
}
