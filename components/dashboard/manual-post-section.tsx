// ManualPostSection — khu vực tạo bài đăng thủ công có thể thu/mở
"use client";

import { useState } from "react";
import { ComposeForm } from "./compose-form";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@/components/ui/icons";
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

export function ManualPostSection({
  content,
  keywords,
  generating,
  loading,
  error,
  success,
  mediaType,
  imageUrl,
  isScheduled,
  scheduledTime,
  onContentChange,
  onKeywordsChange,
  onMediaTypeChange,
  onImageUrlChange,
  onIsScheduledChange,
  onScheduledTimeChange,
  onGenerate,
  onPost,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="pt-6 border-t border-slate-200">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-slate-600 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
            <PlusIcon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Tạo bài đăng thủ công</span>
        </div>
        {open ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <ComposeForm
            content={content}
            keywords={keywords}
            generating={generating}
            loading={loading}
            error={error}
            success={success}
            mediaType={mediaType}
            imageUrl={imageUrl}
            isScheduled={isScheduled}
            scheduledTime={scheduledTime}
            onContentChange={onContentChange}
            onKeywordsChange={onKeywordsChange}
            onMediaTypeChange={onMediaTypeChange}
            onImageUrlChange={onImageUrlChange}
            onIsScheduledChange={onIsScheduledChange}
            onScheduledTimeChange={onScheduledTimeChange}
            onGenerate={onGenerate}
            onPost={onPost}
          />
        </div>
      )}
    </section>
  );
}
