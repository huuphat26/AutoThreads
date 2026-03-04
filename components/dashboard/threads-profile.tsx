/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import type { ThreadsUser } from "@/types";

type TokenInfo = {
  isValid: boolean;
  expiresAt: Date | null;
  daysLeft: number;
  scopes: string[];
};

type QuotaInfo = {
  used: number;
  total: number;
  remaining: number;
  resetInHours: number;
};

export type ThreadsProfileData = {
  profile: ThreadsUser | null;
  token: TokenInfo | null;
  quota: QuotaInfo | null;
  profileError?: string | null;
  tokenExpired?: boolean;
};

export function ThreadsProfileCard() {
  const [data, setData] = useState<ThreadsProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/threads/user");
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          setData(json.data as ThreadsProfileData);
        } else {
          setError(json.error ?? "Không thể tải thông tin tài khoản");
        }
      } catch {
        if (!cancelled) setError("Không thể kết nối server");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-2 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Tài khoản Threads
        </h2>
      </div>

      <div className="px-4 py-2">
        {data?.tokenExpired && (
          <div className="text-xs bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 space-y-1">
            <p className="font-semibold text-rose-600">⚠️ Token đã hết hạn</p>
            <p className="text-rose-500">Chạy lại lệnh sau để lấy token mới:</p>
            <code className="block bg-rose-100 text-rose-700 rounded-lg px-2 py-1 font-mono text-[10px] break-all">
              bash get-token.sh YOUR_AUTH_CODE
            </code>
          </div>
        )}
        {error && !data?.tokenExpired && (
          <div className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-3 py-1">
            ⚠ {error}
          </div>
        )}
        {data?.profile ? (
          <div className="flex items-center gap-3">
            {data.profile.threads_profile_picture_url ? (
              <img
                src={data.profile.threads_profile_picture_url}
                alt={data.profile.username}
                className="w-14 h-14 rounded-full object-cover border border-slate-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-base font-bold select-none">
                {/* {(data.profile.username ?? "?")[0].toUpperCase()} */}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-md text-slate-800 truncate">
                {/* {data.profile.name || data.profile.username} */}
              </div>
              <div className="text-md text-slate-400 truncate">
                {/* @{data.profile.username} */}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-slate-100 rounded w-32" />
              <div className="h-2.5 bg-slate-100 rounded w-20" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
