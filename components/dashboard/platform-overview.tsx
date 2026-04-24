/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import type { AccountSafe } from "@/types";

type PlatformKey = "facebook" | "instagram" | "threads";

type OverviewItem = {
  accountId: string;
  accountName: string;
  color: string;
  connected: boolean;
  displayName: string;
  pictureUrl: string | null;
  followersCount: number;
  likesCount: number;
  link?: string;
};

type OverviewData = Record<PlatformKey, OverviewItem[]>;

function PlatformCard({
  platform,
  items,
  loading,
  color,
  href,
}: {
  platform: PlatformKey;
  items: OverviewItem[];
  loading: boolean;
  color: string;
  href: string;
}) {
  const icons = {
    facebook: FacebookIcon,
    instagram: InstagramIcon,
    threads: ThreadsIcon,
  };
  const Icon = icons[platform];

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 bg-slate-100 rounded w-24" />
          <div className="h-12 bg-slate-100 rounded-xl" />
          <div className="h-12 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Link
        href={href}
        className={`group bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-200 ${color}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-semibold">
            {platform === "facebook"
              ? "Facebook"
              : platform === "instagram"
                ? "Instagram"
                : "Threads"}
          </p>
          <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm text-slate-400 mt-3">
          Chưa có tài khoản khả dụng
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`group bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-200 ${color}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 font-semibold">
          {platform === "facebook"
            ? "Facebook"
            : platform === "instagram"
              ? "Instagram"
              : "Threads"}
        </p>
        <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.accountId}
            className="rounded-xl border border-slate-100 px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              {item.pictureUrl ? (
                <img
                  src={item.pictureUrl}
                  alt={item.displayName}
                  className="w-9 h-9 rounded-lg object-cover border border-slate-100"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="font-semibold text-slate-800 truncate text-sm">
                    {item.displayName}
                  </p>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {item.accountName}
                </p>
              </div>
            </div>

            {item.connected ? (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span>
                  <span className="font-medium">
                    {item.followersCount.toLocaleString("vi-VN")}
                  </span>{" "}
                  followers
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  <span className="font-medium">
                    {item.likesCount.toLocaleString("vi-VN")}
                  </span>{" "}
                  likes
                </span>
              </div>
            ) : (
              <p className="text-xs text-rose-500 mt-1">Chưa kết nối</p>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}

export function PlatformOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData>({
    facebook: [],
    instagram: [],
    threads: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const accRes = await fetch("/api/accounts", { cache: "no-store" });
        const accJson = (await accRes.json()) as {
          success: boolean;
          data?: AccountSafe[];
        };

        const accounts = (accJson.data ?? []).filter(
          (a) => a.hasThreads || a.hasFacebook || a.hasInstagram,
        );

        const [facebook, instagram, threads] = await Promise.all([
          Promise.all(
            accounts.map(async (acc) => {
              if (!acc.hasFacebook) {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Facebook",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
              try {
                const r = await fetch(
                  `/api/platforms/facebook?accountId=${encodeURIComponent(acc.id)}`,
                  { cache: "no-store" },
                );
                const json = (await r.json()) as {
                  connected?: boolean;
                  page?: {
                    name?: string;
                    pictureUrl?: string | null;
                    followersCount?: number;
                    fanCount?: number;
                    link?: string | null;
                  } | null;
                };
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: Boolean(json.connected && json.page),
                  displayName: json.page?.name || "Facebook",
                  pictureUrl: json.page?.pictureUrl ?? null,
                  followersCount: json.page?.followersCount ?? 0,
                  likesCount: json.page?.fanCount ?? 0,
                  link: json.page?.link ?? undefined,
                } as OverviewItem;
              } catch {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Facebook",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
            }),
          ),
          Promise.all(
            accounts.map(async (acc) => {
              if (!acc.hasInstagram) {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Instagram",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
              try {
                const r = await fetch(
                  `/api/platforms/instagram?accountId=${encodeURIComponent(acc.id)}`,
                  { cache: "no-store" },
                );
                const json = (await r.json()) as {
                  connected?: boolean;
                  account?: {
                    username?: string;
                    name?: string;
                    followersCount?: number;
                    profilePicture?: string | null;
                  } | null;
                };
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: Boolean(json.connected && json.account),
                  displayName:
                    json.account?.name || json.account?.username || "Instagram",
                  pictureUrl: json.account?.profilePicture ?? null,
                  followersCount: json.account?.followersCount ?? 0,
                  likesCount: 0,
                } as OverviewItem;
              } catch {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Instagram",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
            }),
          ),
          Promise.all(
            accounts.map(async (acc) => {
              if (!acc.hasThreads) {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Threads",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
              try {
                const r = await fetch(
                  `/api/threads/user?accountId=${encodeURIComponent(acc.id)}`,
                  { cache: "no-store" },
                );
                const json = (await r.json()) as {
                  success?: boolean;
                  data?: {
                    profile?: {
                      name?: string;
                      username?: string;
                      followers_count?: number;
                      threads_profile_picture_url?: string | null;
                    } | null;
                  };
                };
                const profile = json.data?.profile;
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: Boolean(json.success && profile),
                  displayName: profile?.name || profile?.username || "Threads",
                  pictureUrl: profile?.threads_profile_picture_url ?? null,
                  followersCount: profile?.followers_count ?? 0,
                  likesCount: 0,
                } as OverviewItem;
              } catch {
                return {
                  accountId: acc.id,
                  accountName: acc.name,
                  color: acc.color,
                  connected: false,
                  displayName: "Threads",
                  pictureUrl: null,
                  followersCount: 0,
                  likesCount: 0,
                } as OverviewItem;
              }
            }),
          ),
        ]);

        if (!cancelled) {
          setData({ facebook, instagram, threads });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <PlatformCard
        platform="facebook"
        items={data.facebook}
        loading={loading}
        color="hover:border-blue-200"
        href="/platforms/facebook"
      />
      <PlatformCard
        platform="instagram"
        items={data.instagram}
        loading={loading}
        color="hover:border-pink-200"
        href="/platforms/instagram"
      />
      <PlatformCard
        platform="threads"
        items={data.threads}
        loading={loading}
        color="hover:border-slate-300"
        href="/platforms/threads"
      />
    </div>
  );
}
