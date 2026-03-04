// ThreadsMonitorBlock — Gom toàn bộ Threads UI vào một block độc lập
"use client";

import type { ThreadsManualPost, ThreadsManualMediaType } from "@/types";
import type {
  DashboardStats,
  ThreadsManualDashboardStats,
} from "@/hooks/use-dashboard";
import { ThreadsProfileCard } from "./threads-profile";
import { StatsSection } from "./stats-section";
import { ManualPostSection } from "./manual-post-section";
import type { ThreadsPost } from "@/types";

type Props = {
  stats: DashboardStats;
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

export function ThreadsMonitorBlock({
  stats,
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
  return (
    <div className="space-y-8">
      {/* <ThreadsProfileCard /> */}

      <section className="space-y-3">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Thống kê tổng hợp
        </h2>
        <StatsSection stats={stats} />
      </section>

      <ManualPostSection
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
  );
}
