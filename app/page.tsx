"use client";

import { useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { Header } from "@/components/layout/header";
import { SchedulerMonitor } from "@/components/dashboard/scheduler-monitor";
import { StatsSection } from "@/components/dashboard/stats-section";
import { HistoryList } from "@/components/dashboard/history-list";
import { ThreadsProfileCard } from "@/components/dashboard/threads-profile";

export default function DashboardPage() {
  const {
    stats,
    posts,
    fetchHistory,
    aiProvider,
    aiProviders,
    handleProviderChange,
    handleModelChange,
    schedulerStatus,
    handleTogglePause,
    lastRefreshed,
    countdown,

    handleDeletePost,
  } = useDashboard();

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header aiProvider={aiProvider} schedulerStatus={schedulerStatus} />

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        <ThreadsProfileCard />
        <section className="space-y-3 ">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Thống kê tổng hợp
          </h2>
          <StatsSection stats={stats} />
        </section>

        <SchedulerMonitor
          status={schedulerStatus}
          lastRefreshed={lastRefreshed}
          countdown={countdown}
          posts={posts}
          aiProvider={aiProvider}
          aiProviders={aiProviders}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
          onTogglePause={handleTogglePause}
        />

        <HistoryList
          posts={posts}
          onRefresh={fetchHistory}
          onDelete={handleDeletePost}
        />
      </main>
    </div>
  );
}

//  <section className="pt-6 border-t border-slate-200">
//           <button
//             onClick={() => setShowCompose(!showCompose)}
//             className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-slate-600 group"
//           >
//             <div className="flex items-center gap-3">
//               <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
//                 <PlusIcon className="w-4 h-4" />
//               </div>
//               <span className="font-semibold text-sm">
//                 Tạo bài đăng thủ công
//               </span>
//             </div>
//             {showCompose ? (
//               <ChevronUpIcon className="w-4 h-4" />
//             ) : (
//               <ChevronDownIcon className="w-4 h-4" />
//             )}
//           </button>

//           {showCompose && (
//             <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
//               <ComposeForm
//                 topic={topic}
//                 content={content}
//                 keywords={keywords}
//                 generating={generating}
//                 loading={loading}
//                 error={error}
//                 success={success}
//                 onTopicChange={setTopic}
//                 onContentChange={setContent}
//                 onKeywordsChange={setKeywords}
//                 onGenerate={handleGenerate}
//                 onPost={handlePost}
//               />
//             </div>
//           )}
//         </section>
