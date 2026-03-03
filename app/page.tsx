"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { Header } from "@/components/layout/header";
import {
  PlatformTabBar,
  type Platform,
} from "@/components/dashboard/platform-tab-bar";
import { ThreadsMonitorBlock } from "@/components/dashboard/threads-monitor-block";
import { FacebookMonitorBlock } from "@/components/platforms/facebook/monitor";
import { InstagramMonitorBlock } from "@/components/platforms/instagram/monitor";
import { AIConfigCard } from "@/components/shared/ai-config-card";
import { AutoSchedulerMonitor } from "@/components/dashboard/auto-scheduler-monitor";

export default function DashboardPage() {
  const [activePlatform, setActivePlatform] = useState<Platform>("threads");

  const {
    stats,
    content,
    setContent,
    keywords,
    setKeywords,
    handleGenerate,
    handlePost,
    aiProvider,
    aiProviders,
    handleProviderChange,
    handleModelChange,
    generating,
    loading,
    error,
    success,
    // compose extras
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    isScheduled,
    setIsScheduled,
    scheduledTime,
    setScheduledTime,
    // manual scheduled posts
    manualPosts,
    manualPostsStats,
    manualPostsLoading,
    manualPostsError,
    fetchManualPosts,
    ensureManualFetched,
    handleCancelManualPost,
    // threads api posts
    threadsPosts,
    threadsTotal,
    threadsLoading,
    threadsError,
    fetchThreadsPosts,
  } = useDashboard();

  // Ensure manual posts are fetched when switching to threads tab
  useEffect(() => {
    if (activePlatform === "threads") {
      ensureManualFetched();
    }
  }, [activePlatform, ensureManualFetched]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header aiProvider={aiProvider} />

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <AIConfigCard
          aiProvider={aiProvider}
          aiProviders={aiProviders}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
        />

        <AutoSchedulerMonitor />

        <PlatformTabBar active={activePlatform} onChange={setActivePlatform} />

        {activePlatform === "facebook" && (
          <FacebookMonitorBlock
            aiProviderId={aiProvider.id}
            aiModel={aiProvider.model}
          />
        )}

        {activePlatform === "threads" && (
          <ThreadsMonitorBlock
            stats={stats}
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
            onContentChange={setContent}
            onKeywordsChange={setKeywords}
            onMediaTypeChange={setMediaType}
            onImageUrlChange={setImageUrl}
            onIsScheduledChange={setIsScheduled}
            onScheduledTimeChange={setScheduledTime}
            onGenerate={handleGenerate}
            onPost={handlePost}
            manualPosts={manualPosts}
            manualPostsStats={manualPostsStats}
            manualPostsLoading={manualPostsLoading}
            manualPostsError={manualPostsError}
            onFetchManualPosts={fetchManualPosts}
            onCancelManualPost={handleCancelManualPost}
            threadsPosts={threadsPosts}
            threadsTotal={threadsTotal}
            threadsLoading={threadsLoading}
            threadsError={threadsError}
            fetchThreadsPosts={fetchThreadsPosts}
          />
        )}

        {activePlatform === "instagram" && (
          <InstagramMonitorBlock
            aiProviderId={aiProvider.id}
            aiModel={aiProvider.model}
          />
        )}
      </main>
    </div>
  );
}
