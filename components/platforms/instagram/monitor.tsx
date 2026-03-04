"use client";

import { useEffect, useState } from "react";
import {
  InstagramIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { InstagramComposeForm } from "./compose-form";
import { InstagramPostsList } from "./posts-list";
import { useInstagramDashboard } from "@/hooks/use-instagram-dashboard";

type IGAccount = {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  followersCount: number;
  mediaCount: number;
  profilePicture: string | null;
  website: string | null;
};

type TokenInfo = {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
};

type IGData = {
  connected: boolean;
  account: IGAccount | null;
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

export function InstagramMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-4o-mini",
}: {
  aiProviderId?: string;
  aiModel?: string;
}) {
  const [data, setData] = useState<IGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const ig = useInstagramDashboard(aiProviderId, aiModel);

  useEffect(() => {
    fetch("/api/platforms/instagram")
      .then((r) => r.json())
      .then((j) => setData(j))
      .catch(() =>
        setData({
          connected: false,
          account: null,
          token: null,
          error: "Không thể kết nối",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    ig.ensureFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  console.log("data.account", data);
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-500 bg-clip-text">
          <span className="text-pink-500">
            <InstagramIcon className="w-5 h-5" />
          </span>
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Instagram Business
          </h2>
        </div>
        {data?.token && <TokenBadge token={data.token} />}
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {loading && (
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

        {!loading && !data?.connected && (
          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
            <p className="text-xs font-semibold text-rose-600">Chưa kết nối</p>
            <p className="text-[11px] text-rose-500 mt-0.5">
              {data?.error ?? "Kiểm tra IG_ACCESS_TOKEN trong .env"}
            </p>
          </div>
        )}

        {!loading && data?.connected && data.account && (
          <div className="space-y-4">
            {/* Profile row */}
            <div className="flex items-center gap-3">
              {data.account.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.account.profilePicture}
                  alt="ig"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-100 to-pink-100 flex items-center justify-center text-pink-500">
                  <InstagramIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {data.account.name ??
                    data.account.username ??
                    "Instagram Account"}
                </p>
                {data.account.username && (
                  <p className="text-[11px] text-slate-400">
                    @{data.account.username}
                  </p>
                )}
                {data.account.biography && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {data.account.biography}
                  </p>
                )}
                <a
                  href="https://www.instagram.com/traidepthichdetox/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-500 hover:text-blue-600 underline"
                >
                  https://www.instagram.com/traidepthichdetox/
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Người theo dõi
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {data.account.followersCount.toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Bài đăng
                </p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">
                  {data.account.mediaCount.toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Token detail */}
            {data.token && (
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Token
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Hết hạn</span>
                  <span className="text-xs font-medium text-slate-700">
                    {data.token.expiresAt
                      ? new Date(data.token.expiresAt).toLocaleDateString(
                          "vi-VN",
                        )
                      : "Không giới hạn"}
                  </span>
                </div>
                {data.token.scopes.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {data.token.scopes.slice(0, 5).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] bg-pink-50 text-pink-500 border border-pink-100 rounded px-1.5 py-0.5 font-mono"
                      >
                        {s}
                      </span>
                    ))}
                    {data.token.scopes.length > 5 && (
                      <span className="text-[9px] text-slate-400">
                        +{data.token.scopes.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-50 pt-3">
              <button
                onClick={() => setComposeOpen((o) => !o)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity"
              >
                {composeOpen ? (
                  <>
                    <ChevronUpIcon className="w-3.5 h-3.5" />
                    Đóng
                  </>
                ) : (
                  <>
                    <PlusIcon className="w-3.5 h-3.5" />
                    Tạo bài đăng
                  </>
                )}
              </button>
            </div>

            {composeOpen && (
              <InstagramComposeForm
                keywords={ig.keywords}
                onKeywordsChange={ig.setKeywords}
                caption={ig.caption}
                onCaptionChange={ig.setCaption}
                mediaType={ig.mediaType}
                onMediaTypeChange={ig.setMediaType}
                imageUrl={ig.imageUrl}
                onImageUrlChange={ig.setImageUrl}
                videoUrl={ig.videoUrl}
                onVideoUrlChange={ig.setVideoUrl}
                shareToFeed={ig.shareToFeed}
                onShareToFeedChange={ig.setShareToFeed}
                isScheduled={ig.isScheduled}
                onIsScheduledChange={ig.setIsScheduled}
                scheduledTime={ig.scheduledTime}
                onScheduledTimeChange={ig.setScheduledTime}
                generating={ig.generating}
                loading={ig.loading}
                error={ig.error}
                success={ig.success}
                onGenerate={ig.handleGenerate}
                onPost={ig.handlePost}
              />
            )}

            {/* Posts list */}
            <InstagramPostsList
              posts={ig.igPosts}
              stats={ig.igStats}
              loading={ig.postsLoading}
              error={ig.postsError}
              onFetch={ig.fetchIGPosts}
              onCancel={ig.handleCancelPost}
            />
          </div>
        )}
      </div>
    </section>
  );
}
