"use client";

// ============================================================
// PlatformNav — Thanh điều hướng sticky dành riêng cho từng
// nền tảng. Xuất hiện cố định trên header khi ở /platforms/*
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  PoolIcon,
} from "@/components/ui/icons";

const PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    href: "/platforms/facebook",
    icon: FacebookIcon,
    activeClass: "bg-[#1877F2] text-white shadow-md shadow-blue-200",
    inactiveClass: "text-slate-500 hover:text-[#1877F2] hover:bg-blue-50",
  },
  {
    id: "threads",
    label: "Threads",
    href: "/platforms/threads",
    icon: ThreadsIcon,
    activeClass: "bg-slate-900 text-white shadow-md shadow-slate-300",
    inactiveClass: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "/platforms/instagram",
    icon: InstagramIcon,
    activeClass:
      "bg-linear-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-md shadow-pink-200",
    inactiveClass: "text-slate-500 hover:text-pink-500 hover:bg-pink-50",
  },
  {
    id: "content-pool",
    label: "Sheets nội dung",
    href: "/platforms/content-pool",
    icon: PoolIcon,
    activeClass: "bg-slate-600 text-white shadow-md shadow-slate-300",
    inactiveClass: "text-slate-500 hover:text-slate-600 hover:bg-slate-100",
  },
] as const;

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-14.25 z-10">
      <div className="max-w-2xl mx-auto px-5 py-1.5">
        <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
          {PLATFORMS.map((p) => {
            const isActive =
              pathname === p.href || pathname.startsWith(p.href + "/");
            const Icon = p.icon;
            return (
              <Link
                key={p.id}
                href={p.href}
                className={`
                  flex-1 flex items-center justify-center gap-1.5
                  px-3 py-2 rounded-lg text-xs font-bold tracking-wide
                  transition-all duration-200
                  ${isActive ? p.activeClass : p.inactiveClass}
                `}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{p.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
