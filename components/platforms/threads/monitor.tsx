"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ThreadsIcon } from "@/components/ui/icons";
import { useDashboard } from "@/hooks/use-dashboard";
import type { AccountSafe, ThreadsUser } from "@/types";
import {
  PlatformMonitorShell,
  PlatformTokenBadge,
  PlatformLoadingState,
  PlatformErrorState,
} from "@/components/shared/platform-monitor";

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

type ThreadsAccountSummary = {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  displayName: string;
  pictureUrl: string | null;
  link: string | null;
  followersCount: number;
};

export function ThreadsMonitorBlock() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<
    ThreadsAccountSummary[]
  >([]);
  const [profileLoading, setProfileLoading] = useState(true);

  const {
    customPrompt: _cp,

    ensureManualFetched,
    accountId,
  } = useDashboard();

  const fetchProfileData = useCallback(async () => {
    setProfileLoading(true);
    try {
      const params = accountId ? { params: { accountId } } : undefined;
      const { data: json } = await axios.get<{
        success: boolean;
        data: ProfileData;
        error?: string;
      }>("/api/threads/user", params);
      if (json.success) {
        setData(json.data);
      } else {
        setData({
          profile: null,
          token: null,
          quota: null,
          profileError: json.error,
        });
      }
    } catch {
      setData({
        profile: null,
        token: null,
        quota: null,
        profileError: "Không thể kết nối",
      });
    } finally {
      setProfileLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    ensureManualFetched();
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
          (acc) => acc.hasThreads,
        );
        const rows = await Promise.all(
          accounts.map(async (acc) => {
            try {
              const { data: json } = await axios.get<{
                success: boolean;
                data: ProfileData;
              }>("/api/threads/user", {
                params: { accountId: acc.id },
              });
              const profile = json.data?.profile;
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: Boolean(json.success && profile),
                displayName: profile?.name || profile?.username || "Threads",
                pictureUrl: profile?.threads_profile_picture_url || null,
                link: profile?.username
                  ? `https://www.threads.com/@${profile.username}`
                  : null,
                followersCount: profile?.followers_count || 0,
              } as ThreadsAccountSummary;
            } catch {
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: false,
                displayName: "Threads",
                pictureUrl: null,
                link: null,
                followersCount: 0,
              } as ThreadsAccountSummary;
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
  }, [accountId]);

  const profile = data?.profile;
  const token = data?.token;

  return (
    <PlatformMonitorShell
      icon={<ThreadsIcon className="w-4 h-4 text-slate-800" />}
      title="Tài khoản Threads"
      badge={token && <PlatformTokenBadge token={token} />}
    >
      {profileLoading && <PlatformLoadingState />}
      {/* 
      <AccountStrip
        value={accountId}
        onChange={setAccountId}
        platform="threads"
        className="mt-2"
      /> */}

      {accountSummaries.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tài khoản Threads
            </p>
            <p className="text-[11px] text-slate-400">
              {accountSummaries.length} tài khoản
            </p>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {[...accountSummaries]
              .sort((a, b) => {
                if (a.id === accountId) return -1;
                if (b.id === accountId) return 1;
                return 0;
              })
              .map((acc) => {
                const active = acc.id === accountId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-xl border p-3 ${
                      active
                        ? "border-slate-400 bg-white shadow-xs"
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

                    <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                        Theo dõi
                      </p>
                      <p className="font-semibold text-slate-700">
                        {acc.followersCount.toLocaleString("vi-VN")}
                      </p>
                    </div>

                    {active && (
                      <p className="text-[10px] text-slate-700 font-semibold mt-2">
                        Đang thao tác
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {!profileLoading && data?.tokenExpired && (
        <PlatformErrorState title="⚠️ Token đã hết hạn">
          <code className="text-[10px] text-rose-500 font-mono mt-1 block">
            bash get-token.sh YOUR_AUTH_CODE
          </code>
        </PlatformErrorState>
      )}

      {!profileLoading && data?.profileError && !data?.tokenExpired && (
        <PlatformErrorState
          title="Không thể tải profile"
          message={data.profileError}
        />
      )}
    </PlatformMonitorShell>
  );
}
