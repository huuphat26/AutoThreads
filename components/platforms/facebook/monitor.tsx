/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FacebookIcon } from "@/components/ui/icons";
import { useFacebookDashboard } from "@/hooks/use-facebook-dashboard";
import type { AccountSafe } from "@/types";
import {
  PlatformMonitorShell,
  PlatformTokenBadge,
  PlatformLoadingState,
  PlatformErrorState,
} from "@/components/shared/platform-monitor";

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

type FBAccountSummary = {
  id: string;
  name: string;
  color: string;
  connected: boolean;
  pageName: string;
  pictureUrl: string | null;
  link: string | null;
  followersCount: number;
  fanCount: number;
};

export function FacebookMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-5.2",
}: {
  aiProviderId?: string;
  aiModel?: string;
}) {
  const [data, setData] = useState<FBData | null>(null);
  const [accountSummaries, setAccountSummaries] = useState<FBAccountSummary[]>(
    [],
  );
  const [pageLoading, setPageLoading] = useState(true);
  const fb = useFacebookDashboard(aiProviderId, aiModel);



  useEffect(() => {
    let active = true;
    const params = fb.accountId
      ? { params: { accountId: fb.accountId } }
      : undefined;
    axios
      .get<FBData>("/api/platforms/facebook", params)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {
        if (active) {
          setData({
            connected: false,
            page: null,
            token: null,
            error: "Không thể kết nối",
          });
        }
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fb.accountId]);

  useEffect(() => {
    fb.ensureFetched();
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
          (acc) => acc.hasFacebook,
        );
        const rows = await Promise.all(
          accounts.map(async (acc) => {
            try {
              const { data: json } = await axios.get<FBData>(
                "/api/platforms/facebook",
                { params: { accountId: acc.id } },
              );
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: Boolean(json.connected && json.page),
                pageName: json.page?.name || "Facebook",
                pictureUrl: json.page?.pictureUrl || null,
                link: json.page?.link || null,
                followersCount: json.page?.followersCount || 0,
                fanCount: json.page?.fanCount || 0,
              } as FBAccountSummary;
            } catch {
              return {
                id: acc.id,
                name: acc.name,
                color: acc.color,
                connected: false,
                pageName: "Facebook",
                pictureUrl: null,
                link: null,
                followersCount: 0,
                fanCount: 0,
              } as FBAccountSummary;
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
  }, [fb.accountId]);

  const token = data?.token;
  const orderedSummaries = useMemo(() => {
    const selectedId = fb.accountId;
    return [...accountSummaries].sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return 0;
    });
  }, [accountSummaries, fb.accountId]);

  return (
    <PlatformMonitorShell
      icon={<FacebookIcon className="w-5 h-5 text-[#1877F2]" />}
      title="Facebook Page"
      badge={token && <PlatformTokenBadge token={token} />}
    >
      {pageLoading && <PlatformLoadingState />}

      {orderedSummaries.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tài khoản Facebook
            </p>
            <p className="text-[11px] text-slate-400">
              {orderedSummaries.length} tài khoản
            </p>
          </div>

          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {orderedSummaries.map((acc) => {
              const active = acc.id === fb.accountId;
              return (
                <div
                  key={acc.id}
                  className={`rounded-xl border p-3 ${
                    active
                      ? "border-blue-300 bg-white shadow-xs"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {acc.pictureUrl ? (
                      <img
                        src={acc.pictureUrl}
                        alt={acc.pageName}
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
                          {acc.pageName}
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
                          Chưa có liên kết trang
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
                        Người thích
                      </p>
                      <p className="font-semibold text-slate-700">
                        {acc.fanCount.toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {active && (
                    <p className="text-[10px] text-blue-600 font-semibold mt-2">
                      Đang thao tác
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!pageLoading && !data?.connected && (
        <PlatformErrorState
          title="Chưa kết nối"
          message={data?.error ?? "Kiểm tra FB_PAGE_ACCESS_TOKEN trong .env"}
        />
      )}
    </PlatformMonitorShell>
  );
}
