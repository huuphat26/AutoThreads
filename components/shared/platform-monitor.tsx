"use client";

// ================================================================
// Shared platform monitor UI — dùng chung cho FB / Threads / IG
// ================================================================

import type { ReactNode } from "react";
import { PlusIcon, ChevronUpIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

// ── TokenBadge ──────────────────────────────────────────────────
// daysLeft: null = unlimited (FB/IG)
//           -1   = active / không có ngày hết hạn (Threads)
//            0   = unlimited (Threads)
//           N>0  = số ngày còn lại

export type TokenBadgeData = {
  isValid: boolean;
  daysLeft: number | null;
};

export function PlatformTokenBadge({ token }: { token: TokenBadgeData }) {
  const { isValid, daysLeft } = token;
  const urgent = isValid && daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
  const warn =
    isValid && daysLeft !== null && daysLeft > 0 && daysLeft <= 14 && !urgent;

  const label = !isValid
    ? "Token hết hạn"
    : daysLeft === null || daysLeft === 0
      ? "Không giới hạn"
      : daysLeft < 0
        ? "Đang hoạt động"
        : `Còn ${daysLeft} ngày`;

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        !isValid
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
          !isValid
            ? "bg-rose-500"
            : urgent
              ? "bg-amber-500"
              : warn
                ? "bg-yellow-500"
                : "bg-emerald-500"
        }`}
      />
      {label}
    </div>
  );
}

// ── PlatformMonitorShell ─────────────────────────────────────────
// Khung ngoài chung: section + header (icon + title + badge) + body

export function PlatformMonitorShell({
  icon,
  title,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            {title}
          </h2>
        </div>
        {badge}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

// ── PlatformLoadingState ─────────────────────────────────────────

export function PlatformLoadingState() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
      <Spinner className="w-3.5 h-3.5" />
      Đang tải thông tin...
    </div>
  );
}

// ── PlatformErrorState ───────────────────────────────────────────

export function PlatformErrorState({
  title,
  message,
  children,
}: {
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
      <p className="text-xs font-semibold text-rose-600">{title}</p>
      {message && (
        <p className="text-[11px] text-rose-500 mt-0.5">{message}</p>
      )}
      {children}
    </div>
  );
}

// ── PlatformProfileRow ───────────────────────────────────────────

export function PlatformProfileRow({
  pictureUrl,
  name,
  username,
  category,
  bio,
  link,
  fallbackIcon,
  fallbackBg = "bg-slate-100 text-slate-500",
}: {
  pictureUrl?: string | null;
  name?: string | null;
  username?: string | null;
  category?: string | null;
  bio?: string | null;
  link?: string | null;
  fallbackIcon: ReactNode;
  fallbackBg?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {pictureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pictureUrl}
          alt={name ?? username ?? "profile"}
          className="w-12 h-12 rounded-xl object-cover border border-slate-100"
        />
      ) : (
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${fallbackBg}`}
        >
          {fallbackIcon}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">
          {name ?? username ?? "-"}
        </p>
        {username && (
          <p className="text-[11px] text-slate-400">@{username}</p>
        )}
        {category && (
          <p className="text-[11px] text-slate-400">{category}</p>
        )}
        {bio && (
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
            {bio}
          </p>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-500 hover:text-blue-600 underline truncate block"
          >
            {link}
          </a>
        )}
      </div>
    </div>
  );
}

// ── PlatformStatsGrid ────────────────────────────────────────────

export type StatItem = {
  label: string;
  value: ReactNode;
};

const COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

export function PlatformStatsGrid({
  stats,
  cols,
}: {
  stats: StatItem[];
  cols?: 2 | 3 | 4;
}) {
  const colsClass = COLS_CLASS[cols ?? stats.length] ?? "grid-cols-2";
  return (
    <div className={`grid ${colsClass} gap-2`}>
      {stats.map((s) => (
        <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {s.label}
          </p>
          <p className="text-xl font-bold text-slate-800 mt-0.5">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── PlatformComposeButton ────────────────────────────────────────

export function PlatformComposeButton({
  open,
  onToggle,
  closedLabel = "Tạo bài đăng",
  openLabel = "Đóng",
  className = "bg-slate-800 hover:bg-slate-700 text-white transition-colors",
}: {
  open: boolean;
  onToggle: () => void;
  closedLabel?: string;
  openLabel?: string;
  className?: string;
}) {
  return (
    <div className="border-t border-slate-50 pt-3">
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold ${className}`}
      >
        {open ? (
          <>
            <ChevronUpIcon className="w-3.5 h-3.5" />
            {openLabel}
          </>
        ) : (
          <>
            <PlusIcon className="w-3.5 h-3.5" />
            {closedLabel}
          </>
        )}
      </button>
    </div>
  );
}
