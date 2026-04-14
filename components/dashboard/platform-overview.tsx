/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import {
  usePlatforms,
  type PlatformAccount,
} from "@/contexts/platforms-context";

function PlatformCard({
  platform,
  data,
  color,
  href,
}: {
  platform: "facebook" | "instagram" | "threads";
  data: PlatformAccount | null;
  color: string;
  href: string;
}) {
  const icons = {
    facebook: FacebookIcon,
    instagram: InstagramIcon,
    threads: ThreadsIcon,
  };
  const Icon = icons[platform];

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-3 bg-slate-100 rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-md transition-all duration-200 ${color}`}
    >
      <div className="flex items-center gap-3">
        {data.pictureUrl ? (
          <img
            src={data.pictureUrl}
            alt={data.name}
            className="w-12 h-12 rounded-xl object-cover border border-slate-100"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <Icon className="w-6 h-6 text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">
            {platform === "facebook"
              ? "Facebook"
              : platform === "instagram"
                ? "Instagram"
                : "Threads"}
          </p>
          <p className="font-semibold text-slate-800 truncate text-sm">
            {data?.name || "Chưa kết nối"}
          </p>
          {data.connected ? (
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-500">
                <span className="font-medium">
                  {data.followersCount.toLocaleString("vi-VN")}
                </span>{" "}
                followers
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">
                <span className="font-medium">
                  {data.likesCount.toLocaleString("vi-VN")}
                </span>{" "}
                likes
              </span>
            </div>
          ) : (
            <p className="text-xs text-rose-500 mt-0.5">Chưa kết nối</p>
          )}
        </div>
        <ArrowRightIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

export function PlatformOverview() {
  const { data, loading } = usePlatforms();

  const fb = loading ? null : data?.facebook;
  const ig = loading ? null : data?.instagram;
  const threads = loading ? null : data?.threads;

  // console.log("data =>>>>", JSON.stringify(data, null, 4));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <PlatformCard
        platform="facebook"
        data={fb}
        color="hover:border-blue-200"
        href="/platforms/facebook"
      />
      {/* <PlatformCard
        platform="instagram"
        data={ig}
        color="hover:border-pink-200"
        href="/platforms/instagram"
      /> */}
      <PlatformCard
        platform="threads"
        data={threads}
        color="hover:border-slate-300"
        href="/platforms/threads"
      />
    </div>
  );
}
