"use client";
import { useEffect, useRef, useState } from "react";
import {
  ThreadsIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { ComposeForm } from "@/components/dashboard/compose-form";
import { useDashboard } from "@/hooks/use-dashboard";
import type { ThreadsUser } from "@/types";

type TokenInfo = {
  isValid: boolean;
  expiresAt: Date | null;
  daysLeft: number;
  scopes: string[];
};

type ProfileData = {
  profile: ThreadsUser | null;
  token: TokenInfo | null;
  quota: {
    used: number;
    total: number;
    remaining: number;
    resetInHours: number;
  } | null;
  profileError?: string | null;
  tokenExpired?: boolean;
};

function TokenBadge({ token }: { token: TokenInfo }) {
  const days = token.daysLeft;
  const urgent = token.isValid && days > 0 && days <= 7;
  const warn = token.isValid && days > 0 && days <= 14 && !urgent;
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
        : days === -1
          ? "Đang hoạt động"
          : days === 0
            ? "Không giới hạn"
            : `Còn ${days} ngày`}
    </div>
  );
}

export function ThreadsMonitorBlock() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const fetched = useRef(false);

  const [composeOpen, setComposeOpen] = useState(false);

  const {
    content,
    setContent,
    keywords,
    setKeywords,
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    isScheduled,
    setIsScheduled,
    scheduledTime,
    setScheduledTime,
    generating,
    loading,
    error,
    success,
    handleGenerate,
    handlePost,
    ensureManualFetched,
  } = useDashboard();

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch("/api/threads/user")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data as ProfileData);
        else
          setData({
            profile: null,
            token: null,
            quota: null,
            profileError: j.error,
          });
      })
      .catch(() =>
        setData({
          profile: null,
          token: null,
          quota: null,
          profileError: "Không thể kết nối",
        }),
      )
      .finally(() => setProfileLoading(false));

    ensureManualFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = data?.profile;
  const token = data?.token;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800">
            <ThreadsIcon className="w-4 h-4" />
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Tài khoản Threads
            </h2>
          </div>
          {token && <TokenBadge token={token} />}
        </div>

        <div className="px-5 py-4">
          {profileLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
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

          {!profileLoading && data?.tokenExpired && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
              <p className="text-xs font-semibold text-rose-600">
                ⚠️ Token đã hết hạn
              </p>
              <code className="text-[10px] text-rose-500 font-mono mt-1 block">
                bash get-token.sh YOUR_AUTH_CODE
              </code>
            </div>
          )}

          {!profileLoading && data?.profileError && !data?.tokenExpired && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
              <p className="text-xs font-semibold text-rose-600">
                Không thể tải profile
              </p>
              <p className="text-[11px] text-rose-500 mt-0.5">
                {data.profileError}
              </p>
            </div>
          )}

          {!profileLoading && profile && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {profile.threads_profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.threads_profile_picture_url}
                    alt={profile.username}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 text-base font-bold">
                    {(profile.username ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {profile.name || profile.username}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    @{profile.username}
                  </p>
                  {profile.threads_biography && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-55">
                      {profile.threads_biography}
                    </p>
                  )}
                  <a
                    href="https://www.threads.com/@traidepthichdetox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-500 hover:text-blue-600 underline"
                  >
                    https://www.threads.com/@traidepthichdetox
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div>
        <button
          onClick={() => setComposeOpen((v) => !v)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-400/40 transition-all text-slate-600 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <PlusIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Tạo bài đăng thủ công</span>
          </div>
          {composeOpen ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>

        {composeOpen && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
              onContentChange={setContent}
              onKeywordsChange={setKeywords}
              onMediaTypeChange={setMediaType}
              onImageUrlChange={setImageUrl}
              onIsScheduledChange={setIsScheduled}
              onScheduledTimeChange={setScheduledTime}
              onGenerate={handleGenerate}
              onPost={handlePost}
            />
          </div>
        )}
      </div>
    </div>
  );
}
