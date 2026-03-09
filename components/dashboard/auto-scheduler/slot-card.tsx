"use client";

import { useState } from "react";
import type { AutoPostRecord } from "@/types";
import {
  SLOT_HOURS,
  DELAY_MINUTES,
  PREP_BEFORE_POST_MIN,
  PLATFORMS,
  slotDateToday,
  slotTimeLabel,
  fmtTime,
} from "./constants";
import { Dot, Pill } from "./status-badge";
import { ErrorModal, SuccessModal } from "./post-modals";

// ─── Platform row ─────────────────────────────────────────────

type PlatformResult = AutoPostRecord["facebook"];

function PlatformScheduleRow({
  platformLabel,
  scheduledTime,
  result,
  isPast,
}: {
  platformLabel: string;
  scheduledTime: string;
  result: PlatformResult | null;
  isPast: boolean;
}) {
  const [modal, setModal] = useState<"error" | "success" | null>(null);
  const status = result ? result.status : isPast ? "skipped" : "scheduled";

  return (
    <>
      {modal === "error" && result && (
        <ErrorModal
          platform={platformLabel}
          result={result}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "success" && result && (
        <SuccessModal
          platform={platformLabel}
          result={result}
          onClose={() => setModal(null)}
        />
      )}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-500 w-20 shrink-0">
          {platformLabel}
        </span>
        <span className="text-xs font-mono font-semibold text-slate-600 shrink-0">
          {scheduledTime}
        </span>
        <span className="flex-1" />
        {result?.postedAt && (
          <span className="text-[10px] text-slate-400 shrink-0">
            ✓ {fmtTime(result.postedAt)}
          </span>
        )}
        <Pill status={status} />
        {result?.status === "failed" && result?.errorMessage && (
          <button
            onClick={() => setModal("error")}
            className="text-[10px] text-rose-400 hover:text-rose-600 shrink-0 underline"
          >
            Xem lỗi
          </button>
        )}
        {result?.status === "posted" && (
          <button
            onClick={() => setModal("success")}
            className="text-[10px] text-emerald-500 hover:text-emerald-700 shrink-0 underline"
          >
            Xem bài
          </button>
        )}
      </div>
    </>
  );
}

// ─── Slot card ────────────────────────────────────────────────

export function TodaySlotCard({
  slotId,
  record,
  onRetry,
  onDismiss,
  dismissed,
}: {
  slotId: string;
  record: AutoPostRecord | null;
  onRetry?: (slotId: string) => void;
  onDismiss?: (slotId: string, recordId?: string) => void;
  dismissed?: boolean;
}) {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 15 };
  const slotName =
    slotId === "morning"
      ? "Buổi sáng"
      : slotId === "lunch"
        ? "Buổi trưa"
        : "Buổi tối";

  const baseTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const prepH = m - PREP_BEFORE_POST_MIN >= 0 ? h : h - 1;
  const prepM = (60 + m - PREP_BEFORE_POST_MIN) % 60;
  const prepTime = `${String(prepH).padStart(2, "0")}:${String(prepM).padStart(2, "0")}`;

  const now = new Date();
  const isRunning = record?.overallStatus === "running";
  const isContentReady = record?.overallStatus === "content_ready";
  const overallStatus =
    record?.overallStatus ??
    (now > slotDateToday(slotId, 4) ? "skipped" : "scheduled");
  const overallPill = isRunning
    ? "running"
    : isContentReady
      ? "content_ready"
      : overallStatus;

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Dot status={overallPill} />
          <span className="text-xs font-semibold text-slate-700">{slotName}</span>
          <span className="text-xs font-mono text-slate-400">{baseTime}</span>
        </div>
        <div className="flex items-center gap-2">
          {record?.topicLabel && (
            <span className="text-[10px] text-slate-400 truncate max-w-36 italic">
              {record.topicLabel}
            </span>
          )}
          <Pill status={overallPill} />
        </div>
      </div>

      {/* Timeline bar */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 text-[9px] text-slate-400">
        <span className="font-mono font-semibold">{prepTime}</span>
        <span>→ Chuẩn bị</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{baseTime}</span>
        <span>→ FB</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{slotTimeLabel(slotId, DELAY_MINUTES)}</span>
        <span>→ Threads</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{slotTimeLabel(slotId, DELAY_MINUTES * 2)}</span>
        <span>→ IG</span>
        {isContentReady && (
          <span className="ml-auto text-sky-500 font-semibold">✓ Sẵn sàng đăng</span>
        )}
        {record?.overallStatus === "waiting_for_ai" && (
          <span className="ml-auto text-violet-500 font-semibold animate-pulse">
            ⚡ Đang soạn AI…
          </span>
        )}
        {record?.overallStatus === "no_image" && (
          <span className="ml-auto text-rose-500 font-semibold">
            ❌ Thiếu ảnh
          </span>
        )}
      </div>

      {/* Retry banner khi slot bị bỏ qua (không có record) */}
      {overallStatus === "skipped" && !record && !dismissed && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <span className="text-xs text-amber-700">
            Slot này đã bị bỏ qua — không có nội dung trong Content Pool lúc chuẩn bị.
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onRetry && (
              <button
                onClick={() => onRetry(slotId)}
                className="text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Đăng lại
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(slotId)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors"
              >
                Bỏ qua
              </button>
            )}
          </div>
        </div>
      )}

      {/* Retry banner khi slot bị lỗi (failed/partial) */}
      {record && !dismissed && (record.overallStatus === "failed" || record.overallStatus === "partial") && (
        <div className={`flex items-center justify-between px-4 py-2.5 border-b ${record.overallStatus === "failed"
          ? "bg-rose-50 border-rose-100"
          : "bg-amber-50 border-amber-100"
          }`}>
          <span className={`text-xs ${record.overallStatus === "failed" ? "text-rose-700" : "text-amber-700"
            }`}>
            {record.overallStatus === "failed"
              ? "Tất cả nền tảng đều thất bại — bạn có muốn thử đăng lại?"
              : "Một số nền tảng bị lỗi — bạn có muốn thử đăng lại?"}
          </span>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onRetry && (
              <button
                onClick={() => onRetry(slotId)}
                className={`text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors ${record.overallStatus === "failed"
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-amber-500 hover:bg-amber-600"
                  }`}
              >
                Đăng lại
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(slotId, record.id)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors"
              >
                Bỏ qua
              </button>
            )}
          </div>
        </div>
      )}

      {/* Platform rows */}
      <div>
        {PLATFORMS.map((p) => (
          <PlatformScheduleRow
            key={p.key}
            platformLabel={p.label}
            scheduledTime={slotTimeLabel(slotId, p.delayMin)}
            result={
              record
                ? (record[p.key as "facebook" | "threads" | "instagram"] ?? null)
                : null
            }
            isPast={now > slotDateToday(slotId, p.delayMin)}
          />
        ))}
      </div>
    </div>
  );
}
