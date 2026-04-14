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
import { Pill } from "./status-badge";
import { ErrorModal, SuccessModal } from "./post-modals";

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
      <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-500 w-14 sm:w-20 shrink-0">
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
            Lỗi
          </button>
        )}
        {result?.status === "posted" && (
          <button
            onClick={() => setModal("success")}
            className="text-[10px] text-emerald-500 hover:text-emerald-700 shrink-0 underline"
          >
            Xem
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
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              slotId === "morning"
                ? "bg-amber-100 text-amber-600"
                : slotId === "lunch"
                  ? "bg-orange-100 text-orange-600"
                  : "bg-indigo-100 text-indigo-600"
            }`}
          >
            {slotId === "morning" ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : slotId === "lunch" ? (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-700">
              {slotName}
            </span>
            <span className="text-xs font-mono text-slate-400 ml-2">
              {baseTime}
            </span>
          </div>
        </div>
        <Pill status={overallPill} />
      </div>

      {/* Timeline bar */}
      <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 text-[9px] text-slate-400">
        <div className="flex items-center gap-1">
          <span className="font-mono font-semibold">{prepTime}</span>
          <span>→</span>
          <span>Prep</span>
          <span className="mx-1 text-slate-200">|</span>
          <span className="font-mono font-semibold">{baseTime}</span>
          <span>→</span>
          <span className="text-blue-500">FB</span>
          <span className="mx-1 text-slate-200">|</span>
          <span className="font-mono font-semibold">
            {slotTimeLabel(slotId, DELAY_MINUTES)}
          </span>
          <span className="text-slate-600">→Th</span>
          <span className="mx-1 text-slate-200">|</span>
          <span className="font-mono font-semibold">
            {slotTimeLabel(slotId, DELAY_MINUTES * 2)}
          </span>
          <span className="text-pink-500">→IG</span>
          {isContentReady && (
            <span className="ml-auto text-emerald-500 font-semibold whitespace-nowrap">
              ✓ Sẵn sàng
            </span>
          )}
          {record?.overallStatus === "waiting_for_ai" && (
            <span className="ml-auto text-violet-500 font-semibold animate-pulse whitespace-nowrap">
              ⚡ AI…
            </span>
          )}
          {record?.overallStatus === "no_image" && (
            <span className="ml-auto text-rose-500 font-semibold whitespace-nowrap">
              ❌ Thiếu ảnh
            </span>
          )}
        </div>
      </div>

      {/* Retry banner khi slot bị bỏ qua (không có record) */}
      {/* {overallStatus === "skipped" && !record && !dismissed && (
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
      )} */}

      {/* Retry banner khi slot bị lỗi (failed/partial) */}
      {record &&
        !dismissed &&
        (record.overallStatus === "failed" ||
          record.overallStatus === "partial") && (
          <div
            className={`flex items-center justify-between px-4 py-2.5 border-b ${
              record.overallStatus === "failed"
                ? "bg-rose-50 border-rose-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <span
              className={`text-xs ${
                record.overallStatus === "failed"
                  ? "text-rose-700"
                  : "text-amber-700"
              }`}
            >
              {record.overallStatus === "failed"
                ? "Tất cả nền tảng đều thất bại — bạn có muốn thử đăng lại?"
                : "Một số nền tảng bị lỗi — bạn có muốn thử đăng lại?"}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {onRetry && (
                <button
                  onClick={() => onRetry(slotId)}
                  className={`text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-colors ${
                    record.overallStatus === "failed"
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
                ? (record[p.key as "facebook" | "threads" | "instagram"] ??
                  null)
                : null
            }
            isPast={now > slotDateToday(slotId, p.delayMin)}
          />
        ))}
      </div>
    </div>
  );
}
