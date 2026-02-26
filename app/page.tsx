// ============================================
// AUTO THREADS - Dashboard chính
// ============================================
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { PostSlot, ContentTopic, ScheduledPost } from "@/types";

// ---- SVG Icons ----
const SparklesIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
    />
  </svg>
);
const SendIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
    />
  </svg>
);
const RefreshIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);
const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const ClockIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const ErrorIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const DocIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);
const ChartIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);
const SpinIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-20"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="3"
    />
    <path
      className="opacity-70"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ---- Config ----
const SLOT_LABELS: Record<PostSlot, { label: string }> = {
  morning: { label: "7:30 Sáng" },
  noon: { label: "12:00 Trưa" },
  evening: { label: "18:00 Tối" },
};

const TOPIC_LABELS: Record<ContentTopic, string> = {
  detox: "Detox & Thanh lọc",
  beauty: "Làm đẹp & Sắc vóc",
  recipe: "Công thức nước ép",
  sales: "Sản phẩm Detox",
  community: "Cộng đồng Detox",
};

const STATUS_CONFIG = {
  posted: {
    label: "Đã đăng",
    colorClass: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: CheckIcon,
  },
  pending: {
    label: "Đang chờ",
    colorClass: "bg-stone-100 text-stone-500 border-stone-200",
    Icon: ClockIcon,
  },
  failed: {
    label: "Thất bại",
    colorClass: "bg-rose-50 text-rose-500 border-rose-200",
    Icon: ErrorIcon,
  },
  draft: {
    label: "Nháp",
    colorClass: "bg-zinc-100 text-zinc-400 border-zinc-200",
    Icon: DocIcon,
  },
};

// ---- StatCard ----
function StatCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: number;
  Icon: () => React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}
      >
        <Icon />
      </div>
      <div>
        <div className="text-xl font-semibold text-slate-700">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

// ---- Main ----
export default function Home() {
  const [stats, setStats] = useState({
    total: 0,
    posted: 0,
    failed: 0,
    pending: 0,
    draft: 0,
  });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [composeSlot, setComposeSlot] = useState<PostSlot>("morning");
  const [composeTopic, setComposeTopic] = useState<ContentTopic>("detox");
  const [composeContent, setComposeContent] = useState("");
  const [keywords, setKeywords] = useState("");

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const json = await res.json();
      if (json.success) {
        setPosts(json.data.posts);
        setStats(json.data.stats);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchHistory();
    const id = setInterval(fetchHistory, 15000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: composeSlot,
          topic: composeTopic,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) setComposeContent(json.data.fullPost);
      else setError(json.error || "Lỗi tạo nội dung");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!composeContent.trim()) {
      setError("Vui lòng tạo hoặc nhập nội dung");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: composeContent,
          slot: composeSlot,
          topic: composeTopic,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Đăng thành công! ID: ${json.data.threadsPostId}`);
        setComposeContent("");
        fetchHistory();
      } else setError(json.error || "Đăng bài thất bại");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-800 tracking-tight">
              AutoThreads
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Scheduler đang chạy
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        {/* ── Compose (FIRST, prominent) ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap flex-shrink-0"
            >
              {generating ? <SpinIcon /> : <SparklesIcon />}
              {generating ? "Đang tạo..." : "Tạo bằng AI"}
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  Khung giờ
                </label>
                <select
                  value={composeSlot}
                  onChange={(e) => setComposeSlot(e.target.value as PostSlot)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                >
                  {(
                    Object.entries(SLOT_LABELS) as [
                      PostSlot,
                      (typeof SLOT_LABELS)[PostSlot],
                    ][]
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
                  value={composeTopic}
                  onChange={(e) =>
                    setComposeTopic(e.target.value as ContentTopic)
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                >
                  {(
                    Object.entries(TOPIC_LABELS) as [ContentTopic, string][]
                  ).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                Từ khóa (cách nhau bằng dấu phẩy)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="vd: nước ép detox, giảm cân, thanh lọc cơ thể"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-500">
                  Nội dung
                </label>
                <span className="text-xs text-slate-300">
                  {composeContent.length} ký tự
                </span>
              </div>
              <textarea
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value)}
                rows={7}
                placeholder='Nhấn "Tạo bằng AI" để tự động tạo nội dung, hoặc nhập thủ công...'
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent resize-none leading-relaxed"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
                <ErrorIcon />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 border border-slate-200 px-3 py-2.5 rounded-xl">
                <CheckIcon />
                <span>{success}</span>
              </div>
            )}

            <button
              onClick={handlePost}
              disabled={loading || !composeContent.trim()}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? <SpinIcon /> : <SendIcon />}
              {loading ? "Đang đăng..." : "Đăng lên Threads"}
            </button>
          </div>
        </section>

        {/* ── Stats ── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tổng quan
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Tổng bài"
              value={stats.total}
              Icon={DocIcon}
              accent="bg-slate-100 text-slate-500"
            />
            <StatCard
              label="Đã đăng"
              value={stats.posted}
              Icon={CheckIcon}
              accent="bg-slate-100 text-slate-600"
            />
            <StatCard
              label="Đang chờ"
              value={stats.pending}
              Icon={ClockIcon}
              accent="bg-stone-100 text-stone-500"
            />
            <StatCard
              label="Thất bại"
              value={stats.failed}
              Icon={ErrorIcon}
              accent="bg-rose-50 text-rose-400"
            />
          </div>
        </section>

        {/* ── History ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Lịch sử bài đăng
            </h2>
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshIcon />
              Làm mới
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <DocIcon />
              </div>
              <p className="text-sm text-slate-400">
                Chưa có bài nào được đăng — hãy tạo bài đầu tiên!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {posts.map((post) => {
                const st = STATUS_CONFIG[post.status];
                return (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${st.colorClass}`}
                        >
                          <st.Icon />
                          {st.label}
                        </span>
                        <span className="text-xs text-slate-300">
                          {SLOT_LABELS[post.slot]?.label}
                        </span>
                        <span className="text-xs text-slate-300">
                          {TOPIC_LABELS[post.topic]}
                        </span>
                      </div>
                      <span className="text-xs text-slate-300 whitespace-nowrap shrink-0">
                        {post.postedAt
                          ? new Date(post.postedAt).toLocaleString("vi-VN")
                          : new Date(post.scheduledAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {post.content}
                    </p>
                    {post.threadsPostId && (
                      <p className="text-xs text-slate-300 mt-2">
                        ID: {post.threadsPostId}
                      </p>
                    )}
                    {post.errorMessage && (
                      <p className="text-xs text-rose-400 mt-2 bg-rose-50 px-2 py-1 rounded-lg">
                        Lỗi: {post.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
