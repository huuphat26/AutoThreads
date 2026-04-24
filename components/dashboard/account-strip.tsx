"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccountSafe } from "@/types";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
} from "@/components/ui/icons";

type Props = {
  value?: string;
  onChange: (accountId: string) => void;
  className?: string;
  platform?: "threads" | "facebook" | "instagram";
};

function isUsableAccount(acc: AccountSafe): boolean {
  return acc.hasThreads || acc.hasFacebook || acc.hasInstagram;
}

function supportsPlatform(
  acc: AccountSafe,
  platform?: "threads" | "facebook" | "instagram",
): boolean {
  if (!platform) return isUsableAccount(acc);
  if (platform === "threads") return acc.hasThreads;
  if (platform === "facebook") return acc.hasFacebook;
  return acc.hasInstagram;
}

export function AccountStrip({
  value,
  onChange,
  className = "",
  platform,
}: Props) {
  const [accounts, setAccounts] = useState<AccountSafe[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/accounts", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const usable = (json.data as AccountSafe[]).filter((acc) =>
          supportsPlatform(acc, platform),
        );
        setAccounts(usable);

        if (
          usable.length > 0 &&
          (!value || !usable.some((a) => a.id === value))
        ) {
          const def = usable.find((a) => a.isDefault) ?? usable[0];
          onChange(def.id);
        }
      })
      .finally(() => setLoaded(true));
  }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedId = useMemo(() => {
    if (value) return value;
    return accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id;
  }, [accounts, value]);

  if (!loaded || accounts.length <= 1) return null;

  return (
    <section
      className={`bg-white border border-slate-200 rounded-xl p-2.5 ${className}`}
    >
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {platform === "facebook"
            ? "Tài khoản Facebook"
            : platform === "instagram"
              ? "Tài khoản Instagram"
              : platform === "threads"
                ? "Tài khoản Threads"
                : "Tài khoản đang quản lý"}
        </p>
        <p className="text-[10px] text-slate-400">
          {accounts.length} tài khoản
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {accounts.map((acc) => {
          const active = acc.id === selectedId;

          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => onChange(acc.id)}
              className={`text-left rounded-lg border px-3 py-2 transition-all ${
                active
                  ? "border-slate-700 bg-slate-50 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: acc.color }}
                >
                  {acc.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {acc.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {acc.niche || "Chưa cấu hình niche"}
                  </p>
                </div>
                {active && (
                  <span className="ml-auto text-[10px] font-semibold text-slate-600">
                    Đang xem
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    acc.hasThreads
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-50 text-slate-300"
                  }`}
                >
                  <ThreadsIcon className="w-2.5 h-2.5" />
                  Threads
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    acc.hasFacebook
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-50 text-slate-300"
                  }`}
                >
                  <FacebookIcon className="w-2.5 h-2.5" />
                  Facebook
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                    acc.hasInstagram
                      ? "bg-pink-50 text-pink-600"
                      : "bg-slate-50 text-slate-300"
                  }`}
                >
                  <InstagramIcon className="w-2.5 h-2.5" />
                  Instagram
                </span>
                {acc.isDefault && (
                  <span className="ml-auto text-[9px] text-emerald-600 font-semibold">
                    default
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
