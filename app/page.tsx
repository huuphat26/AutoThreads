// Dashboard — page entry point (orchestrator only)
"use client";

import { useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { Header } from "@/components/layout/header";
import { ComposeForm } from "@/components/dashboard/compose-form";
import { StatsSection } from "@/components/dashboard/stats-section";
import { HistoryList } from "@/components/dashboard/history-list";
import {
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

export default function DashboardPage() {
  const {
    stats,
    posts,
    fetchHistory,
    slot,
    setSlot,
    topic,
    setTopic,
    content,
    setContent,
    keywords,
    setKeywords,
    handleGenerate,
    handlePost,
    loading,
    generating,
    error,
    success,
  } = useDashboard();

  const [showCompose, setShowCompose] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header />
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-10">
        {/* Monitoring Section Top */}
        <StatsSection stats={stats} />

        <HistoryList posts={posts} onRefresh={fetchHistory} />

        {/* Manual Post Section - Lower Priority */}
        <section className="pt-6 border-t border-slate-200">
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-slate-600 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <PlusIcon className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">
                Tạo bài đăng thủ công
              </span>
            </div>
            {showCompose ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>

          {showCompose && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <ComposeForm
                slot={slot}
                topic={topic}
                content={content}
                keywords={keywords}
                generating={generating}
                loading={loading}
                error={error}
                success={success}
                onSlotChange={setSlot}
                onTopicChange={setTopic}
                onContentChange={setContent}
                onKeywordsChange={setKeywords}
                onGenerate={handleGenerate}
                onPost={handlePost}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
