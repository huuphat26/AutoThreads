// HistoryList — danh sách lịch sử bài đăng
"use client";

import type { ScheduledPost } from "@/types";
import { PostCard } from "./post-card";
import { RefreshIcon, DocumentIcon } from "@/components/ui/icons";

type Props = {
  posts: ScheduledPost[];
  onRefresh: () => void;
};

export function HistoryList({ posts, onRefresh }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Lịch sử bài đăng
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RefreshIcon />
          Làm mới
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <DocumentIcon className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-400">
            Chưa có bài nào được đăng — hãy tạo bài đầu tiên!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
