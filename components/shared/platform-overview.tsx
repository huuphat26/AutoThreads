"use client";

import { useEffect, useState } from "react";
import { FacebookIcon, ThreadsIcon } from "@/components/ui/icons";

type PlatStatus = {
  connected: boolean;
  label: string;
  daysLeft: number | null;
  loading: boolean;
};

function Dot({ ok, urgent }: { ok: boolean; urgent?: boolean }) {
  return (
    <span
      className={`w-2 h-2 rounded-full inline-block shrink-0 ${
        !ok ? "bg-rose-400" : urgent ? "bg-amber-400" : "bg-emerald-400"
      }`}
    />
  );
}

function PlatCard({
  label,
  icon,
  color,
  status,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  status: PlatStatus;
}) {
  const urgent = status.daysLeft !== null && status.daysLeft <= 7;
  const warn = status.daysLeft !== null && status.daysLeft <= 14 && !urgent;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-white ${
        !status.connected
          ? "border-rose-100"
          : urgent
            ? "border-amber-100"
            : warn
              ? "border-yellow-100"
              : "border-slate-100"
      }`}
    >
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {status.loading ? (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
          ) : (
            <Dot ok={status.connected} urgent={urgent} />
          )}
          <span className="text-xs font-semibold text-slate-700">{label}</span>
        </div>
        <p
          className={`text-[10px] mt-0.5 ${
            status.loading
              ? "text-slate-300"
              : !status.connected
                ? "text-rose-500"
                : urgent
                  ? "text-amber-600"
                  : warn
                    ? "text-yellow-600"
                    : "text-emerald-600"
          }`}
        >
          {status.loading
            ? "Đang tải..."
            : !status.connected
              ? "Chưa kết nối"
              : status.daysLeft === null
                ? "Token OK"
                : urgent
                  ? `⚠ Token còn ${status.daysLeft} ngày`
                  : warn
                    ? `Token còn ${status.daysLeft} ngày`
                    : `Token còn ${status.daysLeft} ngày`}
        </p>
      </div>
    </div>
  );
}

export function PlatformOverview() {
  const [threads, setThreads] = useState<PlatStatus>({
    connected: false,
    label: "Threads",
    daysLeft: null,
    loading: true,
  });
  const [fb, setFb] = useState<PlatStatus>({
    connected: false,
    label: "Facebook",
    daysLeft: null,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/threads", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j.data?.token;
        setThreads({
          connected: j.data?.account?.connected ?? false,
          label: "Threads",
          daysLeft: d?.daysLeft ?? null,
          loading: false,
        });
      })
      .catch(() =>
        setThreads({
          connected: false,
          label: "Threads",
          daysLeft: null,
          loading: false,
        }),
      );

    fetch("/api/platforms/facebook", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) =>
        setFb({
          connected: j.connected,
          label: "Facebook",
          daysLeft: j.token?.daysLeft ?? null,
          loading: false,
        }),
      )
      .catch(() =>
        setFb({
          connected: false,
          label: "Facebook",
          daysLeft: null,
          loading: false,
        }),
      );
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2">
      <PlatCard
        label="Threads"
        icon={<ThreadsIcon />}
        color="text-slate-800"
        status={threads}
      />
      <PlatCard
        label="Facebook"
        icon={<FacebookIcon />}
        color="text-[#1877F2]"
        status={fb}
      />
      {/* <PlatCard
        label="Instagram"
        icon={<InstagramIcon />}
        color="text-pink-500"
        status={ig}
      /> */}
    </div>
  );
}
