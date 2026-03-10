"use client";

// ============================================================
// PlatformNav — Thanh điều hướng sticky với dropdown menu
// Mobile: 2 platforms + More dropdown (chứa tất cả 5 options)
// Desktop (lg+): Show all 5 items
// ============================================================

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  PoolIcon,
  UsersIcon,
  EllipsisHorizontalIcon,
} from "@/components/ui/icons";

const ALL_MENUS = [
  {
    id: "facebook",
    label: "Facebook",
    href: "/platforms/facebook",
    icon: FacebookIcon,
    activeClass: "bg-[#1877F2] text-white shadow-md shadow-blue-200",
    inactiveClass: "text-slate-500 hover:text-[#1877F2] hover:bg-blue-50",
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
    id: "threads",
    label: "Threads",
    href: "/platforms/threads",
    icon: ThreadsIcon,
    activeClass: "bg-slate-900 text-white shadow-md shadow-slate-300",
    inactiveClass: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
  },
  {
    id: "content-pool",
    label: "Sheets",
    href: "/platforms/content-pool",
    icon: PoolIcon,
    activeClass: "bg-slate-600 text-white shadow-md shadow-slate-300",
    inactiveClass: "text-slate-500 hover:text-slate-600 hover:bg-slate-100",
  },
  {
    id: "accounts",
    label: "Tài khoản",
    href: "/platforms/accounts",
    icon: UsersIcon,
    activeClass: "bg-indigo-600 text-white shadow-md shadow-indigo-200",
    inactiveClass: "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50",
  },
] as const;

const MOBILE_MAIN_ITEMS = ALL_MENUS.slice(0, 3); // Facebook, Threads
const DESKTOP_ITEMS = ALL_MENUS;

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  inactiveClass: string;
}

function NavButton({
  item,
  isActive,
  compact = false,
}: {
  item: NavItem;
  isActive: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`
        flex-1 flex items-center justify-center gap-1
        ${compact ? "px-1.5 py-1.5" : "px-2 py-2"}
        rounded-lg text-xs font-bold tracking-wide
        transition-all duration-200
        ${isActive ? item.activeClass : item.inactiveClass}
      `}
    >
      <Icon className={compact ? "w-4 h-4" : "w-4 h-4"} />
      <span className={compact ? "hidden" : ""}>{item.label}</span>
    </Link>
  );
}

function DropdownMenu({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
      {ALL_MENUS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onClose}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 text-sm
              transition-colors duration-150
              ${isActive
                ? "bg-slate-100 text-slate-900 font-medium"
                : "text-slate-600 hover:bg-slate-50"
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PlatformNav() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-12 sm:top-14.25 z-10 items-center justify-between">
      <div className="max-w-3xl mx-auto px-2 sm:px-4 py-1">
        <div className="flex items-stretch gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100">
          {/* Mobile: Show 2 main items + More dropdown */}
          <div className="flex-1 flex gap-0.5 lg:hidden">
            {MOBILE_MAIN_ITEMS.map((p) => {
              const isActive =
                pathname === p.href || pathname.startsWith(p.href + "/");
              return (
                <NavButton key={p.id} item={p} isActive={isActive} compact />
              );
            })}

            {/* More dropdown button */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`
                  flex items-center justify-center gap-1
                  px-2 py-1.5 rounded-lg text-xs font-bold tracking-wide
                  transition-all duration-200 h-full
                  ${isDropdownOpen
                    ? "bg-slate-700 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }
                `}
              >
                <EllipsisHorizontalIcon className="w-4 h-4" />
              </button>
              <DropdownMenu
                isOpen={isDropdownOpen}
                onClose={() => setIsDropdownOpen(false)}
                pathname={pathname}
              />
            </div>
          </div>

          {/* Desktop (lg+): Show all items */}
          <div className="hidden lg:flex w-full justify-between gap-1">
            {DESKTOP_ITEMS.map((p) => {
              const isActive =
                pathname === p.href || pathname.startsWith(p.href + "/");
              return <NavButton key={p.id} item={p} isActive={isActive} />;
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
