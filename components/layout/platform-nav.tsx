"use client";

// ============================================================
// PlatformNav — Thanh điều hướng
// Mạng xã hội (dropdown), Sheets, Tài khoản
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PoolIcon, LayoutGridIcon } from "@/components/ui/icons";

const MENUS = [
  {
    id: "social",
    label: "Mạng xã hội",
    href: "/platforms",
    icon: LayoutGridIcon,
    activeClass:
      "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-200",
    inactiveClass: "text-slate-500 hover:text-purple-500 hover:bg-purple-50",
  },
  {
    id: "content-pool",
    label: "Sheets",
    href: "/platforms/content-pool",
    icon: PoolIcon,
    activeClass: "bg-slate-600 text-white shadow-md shadow-slate-300",
    inactiveClass: "text-slate-500 hover:text-slate-600 hover:bg-slate-100",
  },
  // {
  //   id: "accounts",
  //   label: "Tài khoản",
  //   href: "/platforms/accounts",
  //   icon: UsersIcon,
  //   activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-200",
  //   inactiveClass: "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50",
  // },
] as const;

function NavButton({
  item,
  isActive,
}: {
  item: (typeof MENUS)[number];
  isActive: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        flex-1 flex items-center justify-center gap-1.5 px-3 py-2
        rounded-lg text-xs font-bold tracking-wide
        transition-all duration-200
        ${isActive ? item.activeClass : item.inactiveClass}
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-12 sm:top-14.25 z-10">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1">
        <div className="flex items-stretch gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
          {MENUS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return <NavButton key={item.id} item={item} isActive={isActive} />;
          })}
        </div>
      </div>
    </nav>
  );
}
