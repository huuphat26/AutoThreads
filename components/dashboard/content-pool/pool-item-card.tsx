"use client";

import { useState } from "react";
import { ContentPoolItem } from "@/types";
import { TrashIcon } from "@/components/ui/icons";
import { PoolImageGen } from "./pool-image-gen";

// ── Helpers ────────────────────────────────────────────────────
const SLOT_LABEL: Record<string, string> = {
  morning: "Sáng",
  noon: "Trưa",
  evening: "Tối",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ đăng",
  used: "Đã dùng",
  skipped: "Bỏ qua",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  used: "bg-green-50 text-green-700 border-green-200",
  skipped: "bg-slate-100 text-slate-500 border-slate-200",
};

function preview(text: string, max = 90): string {
  if (!text) return "(trống)";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Item card ──────────────────────────────────────────────────
interface ItemCardProps {
  item: ContentPoolItem;
  isLast: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function PoolItemCard({ item, isLast, onDelete, onRefresh }: ItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasImage = !!item.igImageUrl;

  return (
    <div className={`px-4 py-3 ${!isLast ? "border-b border-slate-100" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Slot */}
        <div className="shrink-0 min-w-12 text-center">
          <span className="text-[11px] font-bold text-slate-600">
            {SLOT_LABEL[item.slot] ?? item.slot}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Title row */}
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-semibold text-slate-700 truncate flex-1">
              {item.topicLabel}
            </p>
            {/* Image indicator */}
            {item.imagePrompt && (
              <span
                title={hasImage ? "Đã có ảnh IG" : "Chưa có ảnh IG"}
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasImage ? "bg-green-400" : "bg-amber-400"}`}
              />
            )}
            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold shrink-0 ${STATUS_STYLE[item.status]}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>

          {/* Content previews */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            {[
              { label: "FB", text: item.fbContent },
              { label: "Threads", text: item.threadsContent },
              { label: "IG", text: item.igCaption },
            ].map(({ label, text }) => (
              <p
                key={label}
                className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-[10px] text-slate-500 leading-snug"
              >
                <span className="font-semibold text-slate-600">{label}: </span>
                {preview(text)}
              </p>
            ))}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span>Import: {formatDateTime(item.importedAt)}</span>
            {item.usedAt && (
              <span className="text-green-500">Dùng: {formatDateTime(item.usedAt)}</span>
            )}
          </div>

          {/* Toggle detail */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            {expanded ? "Ẩn chi tiết ▲" : "Xem chi tiết ▼"}
          </button>

          {/* Expanded detail */}
          {expanded && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px] text-slate-600 space-y-2">
              {[
                { label: "Facebook content", text: item.fbContent },
                { label: "Threads content", text: item.threadsContent },
                { label: "Instagram caption", text: item.igCaption },
              ].map(({ label, text }) => (
                <div key={label}>
                  <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
                  <p className="whitespace-pre-wrap wrap-break-word">{text || "(trống)"}</p>
                </div>
              ))}

              <div className="flex flex-wrap gap-3 text-slate-400 pt-1 border-t border-slate-200">
                <span>ID: {item.recordId || "—"}</span>
                <span>
                  Ảnh:{" "}
                  {item.igImageUrl ? (
                    <a
                      href={item.igImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 underline"
                    >
                      Xem ảnh ↗
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>

              <PoolImageGen item={item} onSaved={onRefresh} />
            </div>
          )}
        </div>

        {/* Delete */}
        {item.status === "pending" && (
          <button
            onClick={() => onDelete(item.id)}
            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5"
            title="Xoá item"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Date group card ─────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface GroupCardProps {
  dateKey: string;
  items: ContentPoolItem[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function PoolDateGroup({ dateKey, items, onDelete, onRefresh }: GroupCardProps) {
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const missingImageCount = items.filter((i) => i.imagePrompt && !i.igImageUrl).length;

  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
      {/* Date header */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
        <p className="text-xs font-bold text-slate-700">{formatDate(dateKey)}</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
          {items.length} bài
        </span>
        {pendingCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
            {pendingCount} pending
          </span>
        )}
        {missingImageCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500 border border-orange-200 ml-auto">
            {missingImageCount} thiếu ảnh
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col">
        {items.map((item, idx) => (
          <PoolItemCard
            key={item.id}
            item={item}
            isLast={idx === items.length - 1}
            onDelete={onDelete}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
