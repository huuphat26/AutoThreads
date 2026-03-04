"use client";

import { useEffect, useRef, useState } from "react";
import {
  FacebookIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { FacebookComposeForm } from "./compose-form";
import { FacebookPostsList } from "./posts-list";
import { useFacebookDashboard } from "@/hooks/use-facebook-dashboard";

type PageInfo = {
  id: string;
  name: string;
  fanCount: number;
  followersCount: number;
  link: string | null;
  pictureUrl: string | null;
  category: string | null;
  about: string | null;
  website: string | null;
};

type TokenInfo = {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
  appId: string | null;
  type: string | null;
};

type FBData = {
  connected: boolean;
  page: PageInfo | null;
  token: TokenInfo | null;
  error: string | null;
};

function TokenBadge({ token }: { token: TokenInfo }) {
  const days = token.daysLeft;
  const urgent = days !== null && days <= 7;
  const warn = days !== null && days <= 14 && !urgent;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        !token.isValid
          ? "bg-rose-50 text-rose-600 border-rose-200"
          : urgent
            ? "bg-amber-50 text-amber-600 border-amber-200"
            : warn
              ? "bg-yellow-50 text-yellow-600 border-yellow-200"
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          !token.isValid
            ? "bg-rose-500"
            : urgent
              ? "bg-amber-500"
              : warn
                ? "bg-yellow-500"
                : "bg-emerald-500"
        }`}
      />
      {!token.isValid
        ? "Token hết hạn"
        : days === null
          ? "Không giới hạn"
          : `Còn ${days} ngày`}
    </div>
  );
}

export function FacebookMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-5.2",
}: {
  aiProviderId?: string;
  aiModel?: string;
}) {
  // ── Page info state ─────────────────────────────────────────────────────────
  const [data, setData] = useState<FBData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const fetched = useRef(false);

  // ── Compose section open/close ──────────────────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);

  // ── Facebook dashboard hook ─────────────────────────────────────────────────
  const fb = useFacebookDashboard(aiProviderId, aiModel);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch("/api/platforms/facebook")
      .then((r) => r.json())
      .then((j: FBData) => setData(j))
      .catch(() =>
        setData({
          connected: false,
          page: null,
          token: null,
          error: "Không thể kết nối",
        }),
      )
      .finally(() => setPageLoading(false));
  }, []);

  // Tải danh sách bài đăng khi component mount
  useEffect(() => {
    fb.ensureFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = data?.page;
  const token = data?.token;

  return (
    <div className="space-y-4">
      {/* ── Page Info Card ─────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1877F2]">
            <FacebookIcon className="w-5 h-5" />
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Facebook Page
            </h2>
          </div>
          {token && <TokenBadge token={token} />}
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {pageLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
              <svg
                className="animate-spin w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Đang tải thông tin...
            </div>
          )}

          {!pageLoading && !data?.connected && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
              <p className="text-xs font-semibold text-rose-600">
                Chưa kết nối
              </p>
              <p className="text-[11px] text-rose-500 mt-0.5">
                {data?.error ?? "Kiểm tra FB_PAGE_ACCESS_TOKEN trong .env"}
              </p>
            </div>
          )}

          {!pageLoading && data?.connected && page && (
            <div className="space-y-4">
              {/* Profile row */}
              <div className="flex items-center gap-3">
                {page.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.pictureUrl}
                    alt="page"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#1877F2]">
                    <FacebookIcon className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {page.name}
                  </p>
                  <p className="text-[11px] text-slate-400">ID: {page.id}</p>
                  {page.link && (
                    <a
                      href={
                        "https://www.facebook.com/people/Trai-%C4%91%E1%BA%B9p-detox/61587200434618/"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-500 hover:underline truncate block"
                    >
                      https://www.facebook.com/people/Trai-%C4%91%E1%BA%B9p-detox/61587200434618/
                    </a>
                  )}
                </div>
              </div>

              {/* Page meta */}
              {(page.category || page.about || page.website) && (
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-1">
                  {page.category && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Danh mục
                      </span>
                      <span className="text-[11px] font-medium text-slate-700">
                        {page.category}
                      </span>
                    </div>
                  )}
                  {page.about && (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {page.about}
                    </p>
                  )}
                  {page.website && (
                    <a
                      href={page.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-500 hover:underline block truncate"
                    >
                      {page.website}
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              {(page.fanCount > 0 || page.followersCount > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Người thích
                    </p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">
                      {page.fanCount.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Theo dõi
                    </p>
                    <p className="text-xl font-bold text-slate-800 mt-0.5">
                      {page.followersCount.toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <FacebookPostsList
        posts={fb.fbPosts}
        stats={fb.fbStats}
        loading={fb.postsLoading}
        error={fb.postsError}
        onFetch={fb.fetchFBPosts}
        onCancel={fb.handleCancelPost}
      />
      <div>
        <button
          onClick={() => setComposeOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-[#1877F2]/30 transition-all text-slate-600 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#1877F2] group-hover:bg-blue-100 transition-colors">
              <PlusIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">
              Tạo & Đăng bài Facebook
            </span>
          </div>
          {composeOpen ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>

        {composeOpen && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <FacebookComposeForm
              keywords={fb.keywords}
              content={fb.content}
              mediaType={fb.mediaType}
              imageUrl={fb.imageUrl}
              isScheduled={fb.isScheduled}
              scheduledTime={fb.scheduledTime}
              generating={fb.generating}
              loading={fb.loading}
              error={fb.error}
              success={fb.success}
              onKeywordsChange={fb.setKeywords}
              onContentChange={fb.setContent}
              onMediaTypeChange={fb.setMediaType}
              onImageUrlChange={fb.setImageUrl}
              onIsScheduledChange={fb.setIsScheduled}
              onScheduledTimeChange={fb.setScheduledTime}
              onGenerate={fb.handleGenerate}
              onPost={fb.handlePost}
            />
          </div>
        )}
      </div>
    </div>
  );
}
