// ============================================================
// AIConfigCard — Shared AI engine + model selector
// Hiển thị ở đầu trang, dùng chung cho cả 3 nền tảng
// ============================================================
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

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Hệ thống tự động
        </h2>
        <span className="text-xs text-slate-400 tabular-nums">
          🕐 {clock} (VN)
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-3">
        <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
          {/* Provider row */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{
                  background: aiProvider.available ? "#34d399" : "#f87171",
                }}
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                AI Engine
              </span>
              <span className="text-xs font-semibold text-slate-700 truncate">
                {aiProvider.label}
              </span>
            </div>
            <select
              value={aiProvider.id}
              onChange={(e) => onProviderChange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 shrink-0 cursor-pointer"
            >
              {aiProviders.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.label}
                  {!p.available ? " ⚠ chưa cấu hình" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Model row */}
          <div className="px-3.5 py-2.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Model — {aiProvider.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aiProvider.models.map((m) => (
                <button
                  key={m}
                  onClick={() => onModelChange(aiProvider.id, m)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all ${
                    m === aiProvider.model
                      ? "bg-slate-800 border-slate-700 text-white font-semibold"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                  }`}
                >
                  {m === aiProvider.model && (
                    <span className="mr-1 text-emerald-400">●</span>
                  )}
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
