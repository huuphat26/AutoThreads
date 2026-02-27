/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ThreadsUser } from "@/types";
import { RefreshIcon } from "@/components/ui/icons";

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
};

export function ThreadsProfileCard() {
  const [data, setData] = useState<ThreadsProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/threads/user");
      const json = await res.json();
      if (json.success) {
        setData(json.data as ThreadsProfileData);
      } else {
        setError(json.error ?? "Không thể tải thông tin tài khoản");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-2 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Tài khoản Threads
        </h2>
      </div>

      <div className="px-4 py-2">
        {error && (
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
                {(data.profile.username ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-md text-slate-800 truncate">
                {data.profile.name || data.profile.username}
              </div>
              <div className="text-md text-slate-400 truncate">
                @{data.profile.username}
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
        {/* Bio */}
        {data?.profile?.threads_biography && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-0.5">
            {data.profile.threads_biography}
          </p>
        )}
      </div>
    </section>
  );
}
