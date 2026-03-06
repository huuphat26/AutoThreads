"use client";

import { useEffect, useState } from "react";
import type { ProviderInfo } from "@/types";

type Props = {
  aiProvider: ProviderInfo;
  aiProviders: ProviderInfo[];
  onProviderChange: (id: string) => void;
  onModelChange: (providerId: string, model: string) => void;
};

function vnClock(): string {
  return new Date().toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const PROVIDER_ICONS: Record<string, string> = {
  puter: "◈",
  openai: "○",
  gemini: "◇",
};

export function AIConfigCard({
  aiProvider,
  aiProviders,
  onProviderChange,
  onModelChange,
}: Props) {
  const [clock, setClock] = useState(() => vnClock());

  useEffect(() => {
    const t = setInterval(() => setClock(vnClock()), 1000);
    return () => clearInterval(t);
  }, []);

  const puterProvider = aiProviders.find((p) => p.id === "puter");
  const isPuter = aiProvider.id === "puter";

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Mô hình AI
          </span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
              aiProvider.available
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-rose-50 text-rose-500 border-rose-200"
            }`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                aiProvider.available ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {aiProvider.available ? "Online" : "Offline"}
          </span>
        </div>
        <span className="text-[10px] text-slate-300 tabular-nums font-mono">
          {clock}
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {puterProvider && (
          <div
            className={`rounded-xl border transition-all ${
              isPuter
                ? "border-violet-200 bg-violet-50"
                : "border-slate-100 bg-slate-50 hover:border-slate-200 cursor-pointer"
            }`}
            onClick={() => {
              if (!isPuter) onProviderChange("puter");
            }}
          >
            <div className="flex items-center gap-2.5 px-3 py-2 border-b border-white/60">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isPuter
                    ? "bg-violet-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {PROVIDER_ICONS.puter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${isPuter ? "text-violet-700" : "text-slate-600"}`}
                  >
                    Puter.js
                  </span>
                </div>
              </div>
            </div>

            {isPuter && (
              <div className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                {puterProvider.models.map((m) => {
                  const active = m === aiProvider.model;
                  return (
                    <button
                      key={m}
                      onClick={(e) => {
                        e.stopPropagation();
                        onModelChange("puter", m);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono font-semibold transition-all ${
                        active
                          ? "bg-violet-600 border-violet-500 text-white shadow-sm shadow-violet-200"
                          : "bg-white border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600"
                      }`}
                    >
                      {active && (
                        <span className="mr-1 text-violet-200">●</span>
                      )}
                      {m}
                    </button>
                  );
                })}
              </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
