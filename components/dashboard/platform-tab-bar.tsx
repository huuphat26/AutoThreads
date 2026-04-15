"use client";

import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
} from "@/components/ui/icons";

export type Platform = "facebook" | "threads" | "instagram";

type Tab = {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeStyle?: string;
};

type Props = {
  active: Platform;
  onChange: (p: Platform) => void;
};

export function PlatformTabBar({ active, onChange }: Props) {
  const tabs: Tab[] = [
    {
      id: "facebook",
      label: "Facebook",
      icon: <FacebookIcon className="w-4 h-4" />,
      badgeStyle: "bg-blue-50 text-blue-500 border border-blue-200",
    },
    {
      id: "threads",
      label: "Threads",
      icon: <ThreadsIcon className="w-4 h-4" />,
      badgeStyle: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    },
    {
      id: "instagram",
      label: "Instagram",
      icon: <InstagramIcon className="w-4 h-4" />,
      badgeStyle: "bg-pink-50 text-pink-500 border border-pink-200",
    },
  ];

  const activeStyles: Record<Platform, string> = {
    facebook: "bg-[#1877F2] text-white shadow-md shadow-blue-200",
    threads: "bg-slate-900 text-white shadow-md shadow-slate-200",
    instagram:
      "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-md shadow-pink-200",
  };

  return (
    <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl
              transition-all duration-200 cursor-pointer
              ${isActive ? activeStyles[tab.id] : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}
            `}
          >
            <div className="flex items-center gap-1.5">
              {tab.icon}
              <span
                className={`text-xs font-bold tracking-wide ${isActive ? "text-white" : ""}`}
              >
                {tab.label}
              </span>
            </div>
            {tab.badge && (
              <span
                className={`
                  hidden sm:inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none
                  ${isActive ? "bg-white/20 text-white border border-white/30" : tab.badgeStyle}
                `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
