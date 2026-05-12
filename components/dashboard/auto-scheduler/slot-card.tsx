/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { AutoPostRecord, ContentPoolItem } from "@/types";
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
import { Spinner } from "@/components/ui/icons";

function formatShortDuration(ms: number): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type PlatformResult = AutoPostRecord["facebook"];
type PlatformKey = "facebook" | "threads" | "instagram";

function PlatformScheduleRow({
  platformKey,
  platformLabel,
  scheduledTime,
  result,
  isPast,
}: {
  platformKey: PlatformKey;
  platformLabel: string;
  scheduledTime: string;
  result: PlatformResult | null;
  isPast: boolean;
}) {
  const [modal, setModal] = useState<"error" | "success" | null>(null);
  const status = result ? result.status : isPast ? "skipped" : "scheduled";
  const platformDotClass =
    platformKey === "facebook"
      ? "bg-blue-500"
      : platformKey === "threads"
        ? "bg-slate-600"
        : "bg-pink-500";

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
      <div className="flex items-center gap-2 px-2.5 sm:px-4 py-2.5 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-500 w-16 sm:w-20 shrink-0 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${platformDotClass}`} />
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

export function TodaySlotCard({
  slotId,
  record,
  onRetry,
  onDismiss,
  dismissed,
  platformFilter = "all",
  previewItem,
  onPostNow,
  onRefresh,
}: {
  slotId: "evening";
  record: AutoPostRecord | null;
  onRetry?: (slotId: "evening") => void;
  onDismiss?: (slotId: "evening", recordId?: string) => void;
  dismissed?: boolean;
  platformFilter?: "all" | PlatformKey;
  previewItem?: ContentPoolItem | null;
  onPostNow?: (slotId: "evening") => void;
  onRefresh?: () => void;
}) {
  const [isHotfixing, setIsHotfixing] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hotfixStatus, setHotfixStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const handleHotfix = async () => {
    if ((!record && !previewItem) || !newUrl.trim()) return;
    setIsUpdating(true);
    setHotfixStatus(null);
    try {
      const res = await fetch("/api/auto-scheduler", {
        method: "POST",
        body: JSON.stringify({
          action: "hotfix-image",
          recordId: record?.id,
          poolId: previewItem?.id,
          newImageUrl: newUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHotfixStatus({
          type: "success",
          msg: "Đã cập nhật ảnh thành công!",
        });
        setIsHotfixing(false);
        setNewUrl("");
        setImageError(false);
        if (onRefresh) onRefresh();
      } else {
        setHotfixStatus({
          type: "error",
          msg: data.error || "Lỗi cập nhật ảnh",
        });
      }
    } catch (err) {
      setHotfixStatus({ type: "error", msg: "Lỗi kết nối server" });
    } finally {
      setIsUpdating(false);
    }
  };

  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 15 };
  const slotName = "Buổi tối";

  const baseTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const prepH = m - PREP_BEFORE_POST_MIN >= 0 ? h : h - 1;
  const prepM = (60 + m - PREP_BEFORE_POST_MIN) % 60;
  const prepTime = `${String(prepH).padStart(2, "0")}:${String(prepM).padStart(2, "0")}`;

  const now = new Date();
  const isRunning = record?.overallStatus === "running";
  const isContentReady = record?.overallStatus === "content_ready";
  const isWaitingAI = record?.overallStatus === "waiting_for_ai";
  const overallStatus =
    record?.overallStatus ??
    (now > slotDateToday(slotId, 4) ? "skipped" : "scheduled");
  const overallPill = isRunning
    ? "running"
    : isContentReady
      ? "content_ready"
      : overallStatus;

  const visiblePlatforms =
    platformFilter === "all"
      ? PLATFORMS
      : PLATFORMS.filter((p) => p.key === platformFilter);

  const slotStart = slotDateToday(slotId, 0);
  const diffMs = slotStart.getTime() - now.getTime();
  const lateNoRecord = !record && diffMs < 0;

  const timingHint = isRunning
    ? "Đang đăng tuần tự FB → Threads → IG"
    : isContentReady
      ? "Nội dung đã sẵn sàng, chờ đến giờ đăng"
      : isWaitingAI
        ? "Đang chuẩn bị nội dung"
        : diffMs > 0
          ? `Bắt đầu sau ${formatShortDuration(diffMs)}`
          : lateNoRecord
            ? `Đã trễ ${formatShortDuration(Math.abs(diffMs))}`
            : "Khung giờ đã qua";

  const cardAccent =
    record?.overallStatus === "failed"
      ? "border-rose-200 bg-rose-50/40"
      : record?.overallStatus === "partial"
        ? "border-amber-200 bg-amber-50/40"
        : record?.overallStatus === "running"
          ? "border-blue-200 shadow-md shadow-blue-100/70"
          : record?.overallStatus === "content_ready" ||
              record?.overallStatus === "waiting_for_ai"
            ? "border-violet-200 bg-violet-50/40"
            : record?.overallStatus === "completed"
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-xl border overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 ${cardAccent}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600">
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
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-700">
              {slotName}
            </span>
            <span className="text-sm font-mono font-bold text-slate-600 ml-2">
              {baseTime}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">{timingHint}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!record && onPostNow && (
            <button
              onClick={() => onPostNow(slotId)}
              className="text-[10px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-all active:scale-95"
            >
              Chuẩn bị & đăng ngay
            </button>
          )}
          <Pill status={overallPill} />
        </div>
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
          {isWaitingAI && (
            <span className="ml-auto text-violet-500 font-semibold animate-pulse whitespace-nowrap">
              ⚡ Đang xử lý…
            </span>
          )}
          {record?.overallStatus === "no_image" && (
            <span className="ml-auto text-rose-500 font-semibold whitespace-nowrap">
              ❌ Thiếu ảnh
            </span>
          )}
        </div>
      </div>

      {/* Image Preview & Content Actions */}
      {(record || previewItem) && (
        <div className="px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Preview */}
            {record?.igImageUrl || previewItem?.igImageUrl ? (
              <div className="relative group w-full md:w-48 h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0 shadow-sm flex flex-col">
                <img
                  src={record?.igImageUrl || previewItem?.igImageUrl}
                  alt="Preview"
                  onError={() => setImageError(true)}
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imageError ? "opacity-30 grayscale" : ""}`}
                />

                {imageError && (
                  <div
                    onClick={() => {
                      setIsHotfixing(true);
                      setImageError(false);
                    }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-rose-50/60 backdrop-blur-[2px] cursor-pointer hover:bg-rose-100/70 transition-colors z-10"
                  >
                    <svg
                      className="w-10 h-10 text-rose-500 mb-2 drop-shadow-sm"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                      Ảnh bị lỗi!
                    </p>
                    <p className="text-[10px] text-rose-500 mt-1 font-medium bg-white/80 px-2 py-1 rounded-full shadow-sm">
                      Nhấn để thay ảnh mới
                    </p>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
                  <a
                    href={record?.igImageUrl || previewItem?.igImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white text-[10px] font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/40 transition-colors"
                  >
                    Mở ảnh lớn
                  </a>
                  <button
                    onClick={() => {
                      setIsHotfixing(true);
                      setImageError(false);
                    }}
                    className="text-white text-[10px] font-bold bg-indigo-500/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-indigo-400/30 hover:bg-indigo-600 transition-colors"
                  >
                    🔄 Thay ảnh (Hotfix)
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full md:w-48 h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 shrink-0">
                <svg
                  className="w-8 h-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs text-slate-400 font-medium">
                  Chưa có ảnh
                </span>
              </div>
            )}

            {/* Content Summary & Actions */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-200" />
                    {record ? "Chủ đề: " : "Dự kiến từ Sheet: "}
                    <span className="text-slate-800">
                      {record
                        ? record.topicLabel || record.topic
                        : previewItem?.topicLabel}
                    </span>
                  </p>
                </div>
                <div className="relative p-4 rounded-xl bg-slate-50 border border-slate-100 group">
                  <svg
                    className="absolute -top-2 -left-2 w-6 h-6 text-slate-200"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017V14H17.017C15.9124 14 15.017 13.1046 15.017 12V9C15.017 7.89543 15.9124 7 17.017 7H20.017V10H18.017V12H21.017V21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017V14H6.017C4.91243 14 4.017 13.1046 4.017 12V9C4.017 7.89543 4.91243 7 6.017 7H9.017V10H7.017V12H10.017V21H3.017Z" />
                  </svg>
                  <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed font-medium">
                    {record ? record.content : previewItem?.fbContent}
                  </p>
                </div>

                {isHotfixing && (
                  <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-2 tracking-wider">
                      Nhập URL ảnh mới (Hotfix {record ? "Record" : "Preview"})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        disabled={isUpdating}
                      />
                      <button
                        onClick={handleHotfix}
                        disabled={isUpdating || !newUrl.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                      >
                        {isUpdating ? (
                          <>
                            <Spinner className="w-3 h-3" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Cập nhật"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsHotfixing(false);
                          setNewUrl("");
                          setHotfixStatus(null);
                        }}
                        disabled={isUpdating}
                        className="px-3 py-2 text-slate-500 text-xs font-medium hover:text-slate-700 transition-colors"
                      >
                        Huỷ
                      </button>
                    </div>
                    {hotfixStatus && (
                      <p
                        className={`mt-2 text-[10px] font-bold ${hotfixStatus.type === "success" ? "text-emerald-500" : "text-rose-500"}`}
                      >
                        {hotfixStatus.type === "success" ? "✓ " : "❌ "}
                        {hotfixStatus.msg}
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-indigo-400 italic">
                      * URL mới sẽ được validate và upload lên Cloudinary ngay
                      lập tức.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-3">
                {(isWaitingAI || isRunning) && record ? (
                  <div className="flex items-center gap-2.5 text-sm text-violet-600 font-bold animate-pulse">
                    <Spinner className="w-4 h-4 text-violet-500" />
                    {record.statusMessage || "Hệ thống đang xử lý..."}
                  </div>
                ) : isContentReady && record ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Đã sẵn sàng
                    </span>
                  </div>
                ) : !record && previewItem ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
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
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Sẽ chuẩn bị lúc {prepTime}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {!record && overallStatus === "scheduled" && !previewItem && (
        <div className="px-4 py-3 border-b border-slate-100 bg-white/50">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Không tìm thấy nội dung cho khung giờ này trong Content Pool.
            </p>
          </div>
        </div>
      )}

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
        {visiblePlatforms.map((p) => (
          <PlatformScheduleRow
            key={p.key}
            platformKey={p.key}
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
