/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { InstagramIcon } from "@/components/ui/icons";
import { InstagramComposeForm } from "./compose-form";
import { useInstagramDashboard } from "@/hooks/use-instagram-dashboard";
import type { AccountSafe } from "@/types";
import {
  PlatformMonitorShell,
  PlatformTokenBadge,
  PlatformLoadingState,
  PlatformErrorState,
  PlatformComposeButton,
} from "@/components/shared/platform-monitor";
import { AccountStrip } from "@/components/dashboard/account-strip";

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

type IGAccountSummary = {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  displayName: string;
  pictureUrl: string | null;
  link: string | null;
  followersCount: number;
  mediaCount: number;
};

export function InstagramMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-4o-mini",
}: {
  aiProviderId?: string;
  aiModel?: string;
}) {
  const [data, setData] = useState<IGData | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<IGAccountSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const ig = useInstagramDashboard(aiProviderId, aiModel);

  const fetchAccountInfo = useCallback(async () => {
    setLoading(true);
    try {
      const params = ig.accountId
        ? { params: { accountId: ig.accountId } }
        : undefined;
      const { data: json } = await axios.get<IGData>(
        "/api/platforms/instagram",
        params,
      );
      setData(json);
    } catch {
      setData({
        connected: false,
        account: null,
        token: null,
        error: "Không thể kết nối",
      });
    } finally {
      setLoading(false);
    }
  }, [ig.accountId]);

  useEffect(() => {
    let active = true;
    const params = ig.accountId
      ? { params: { accountId: ig.accountId } }
      : undefined;
    axios
      .get<IGData>("/api/platforms/instagram", params)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active) {
          setData({
            connected: false,
            account: null,
            token: null,
            error: "Không thể kết nối",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ig.accountId]);

  useEffect(() => {
    ig.ensureFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAllAccounts() {
      try {
        const { data: accountsJson } = await axios.get<{
          success: boolean;
          data?: AccountSafe[];
        }>("/api/accounts");

        const accounts = (accountsJson.data ?? []).filter(
          (acc) => acc.hasInstagram,
        );
        const rows = await Promise.all(
          accounts.map(async (acc) => {
            try {
              const { data: json } = await axios.get<IGData>(
                "/api/platforms/instagram",
                { params: { accountId: acc.id } },
              );
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: Boolean(json.connected && json.account),
                displayName:
                  json.account?.name || json.account?.username || "Instagram",
                pictureUrl: json.account?.profilePicture || null,
                link: json.account?.username
                  ? `https://www.instagram.com/${json.account.username}/`
                  : null,
                followersCount: json.account?.followersCount || 0,
                mediaCount: json.account?.mediaCount || 0,
              } as IGAccountSummary;
            } catch {
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: false,
                displayName: "Instagram",
                pictureUrl: null,
                link: null,
                followersCount: 0,
                mediaCount: 0,
              } as IGAccountSummary;
            }
          }),
        );

        if (!cancelled) setAccountSummaries(rows);
      } catch {
        if (!cancelled) setAccountSummaries([]);
      }
    }

    loadAllAccounts();
    return () => {
      cancelled = true;
    };
  }, [ig.accountId]);

  return (
    <PlatformMonitorShell
      icon={
        <span className="text-pink-500">
          <InstagramIcon className="w-5 h-5" />
        </span>
      }
      title="Instagram Business"
      badge={data?.token && <PlatformTokenBadge token={data.token} />}
    >
      {loading && <PlatformLoadingState />}

      <AccountStrip
        value={ig.accountId}
        onChange={ig.setAccountId}
        platform="instagram"
        className="mt-2"
      />

      {accountSummaries.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tài khoản Instagram
            </p>
            <p className="text-[11px] text-slate-400">
              {accountSummaries.length} tài khoản
            </p>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...accountSummaries]
              .sort((a, b) => {
                if (a.id === ig.accountId) return -1;
                if (b.id === ig.accountId) return 1;
                return 0;
              })
              .map((acc) => {
                const active = acc.id === ig.accountId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-xl border p-3 ${
                      active
                        ? "border-pink-300 bg-white shadow-xs"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {acc.pictureUrl ? (
                        <img
                          src={acc.pictureUrl}
                          alt={acc.displayName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-100" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: acc.color }}
                          />
                          <p className="text-xl font-semibold text-slate-800 truncate">
                            {acc.displayName}
                          </p>
                        </div>
                        {acc.link ? (
                          <a
                            href={acc.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-sm truncate block mt-0.5"
                          >
                            {acc.link}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Chưa có liên kết profile
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-semibold whitespace-nowrap ${
                          acc.connected
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-500"
                        }`}
                      >
                        {acc.connected ? "Đã kết nối" : "Chưa kết nối"}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                          Theo dõi
                        </p>
                        <p className="font-semibold text-slate-700">
                          {acc.followersCount.toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                          Bài viết
                        </p>
                        <p className="font-semibold text-slate-700">
                          {acc.mediaCount.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    {active && (
                      <p className="text-[10px] text-pink-600 font-semibold mt-2">
                        Đang thao tác
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {!loading && !data?.connected && (
        <PlatformErrorState
          title="Chưa kết nối"
          message={data?.error ?? "Kiểm tra IG_ACCESS_TOKEN trong .env"}
        />
      )}

      {!loading && data?.connected && data.account && (
        <div className="space-y-4">
          <PlatformComposeButton
            open={composeOpen}
            onToggle={() => setComposeOpen((o) => !o)}
            className="bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity text-white mt-4"
          />

          {composeOpen && (
            <div className="space-y-3">
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
            </div>
          )}
        </div>
      )}
    </PlatformMonitorShell>
  );
}
