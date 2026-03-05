"use client";

// ================================================================
// ContentPoolPanel
// Hiển thị danh sách content pool + upload xlsx + xoá
// ================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { ContentPoolItem } from "@/types";
import { UploadIcon, TrashIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

interface PoolStats {
  total: number;
  pending: number;
  used: number;
  skipped: number;
  lastUpdated: string;
}

interface PoolData {
  stats: PoolStats;
  items: ContentPoolItem[];
}

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

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function previewText(text: string, max = 90): string {
  if (!text) return "(trống)";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function ContentPoolPanel() {
  const [data, setData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(5);
  const PAGE_SIZE = 5;
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/content-pool${filterStatus ? `?status=${filterStatus}` : ""}`,
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    setVisibleCount(5);
    fetchData();
  }, [fetchData]);

  // ── Upload xlsx ──────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploading(true);
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMsg(null);

    const form = new FormData();
    form.append("file", file);
    e.target.value = ""; // reset input

    try {
      const res = await fetch("/api/content-pool/import-xlsx", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (json.success) {
        const { added, updated, skipped: sk, errors } = json.data;
        setUploadMsg(
          `✅ Import thành công: +${added} mới, ~${updated} cập nhật, ${sk} bỏ qua` +
            (errors?.length ? ` | ⚠️ ${errors.length} lỗi` : ""),
        );
        await fetchData();
      } else {
        setUploadMsg(`❌ Lỗi: ${json.error}`);
      }
    } catch {
      setUploadMsg("❌ Lỗi kết nối");
    } finally {
      setUploading(false);
    }
  };

  // ── Xoá pending ─────────────────────────────────────────────
  const handleClearPending = async () => {
    if (!confirm("Xoá tất cả item đang pending?")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/content-pool?clearAll=pending", {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setUploadMsg(`🗑 Đã xoá ${json.data.deleted} item pending`);
        await fetchData();
      }
    } finally {
      setClearing(false);
    }
  };

  // ── Xoá 1 item ──────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await fetch(`/api/content-pool?id=${id}`, { method: "DELETE" });
    await fetchData();
  };

  const stats = data?.stats;
  const items = data?.items ?? [];

  // ── Phân trang ───────────────────────────────────────────────
  const allGroupedByDate = items.reduce<Record<string, ContentPoolItem[]>>(
    (acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    },
    {},
  );
  const allDates = Object.keys(allGroupedByDate).sort((a, b) =>
    a.localeCompare(b),
  );
  const flatItems = allDates.flatMap((d) => allGroupedByDate[d]);
  const visibleItems = flatItems.slice(0, visibleCount);
  const hasMore = visibleCount < flatItems.length;
  const remaining = flatItems.length - visibleCount;

  // Rebuild groups chỉ từ các item đang visible
  const groupedByDate = visibleItems.reduce<Record<string, ContentPoolItem[]>>(
    (acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    },
    {},
  );
  const groupDates = allDates.filter((d) => !!groupedByDate[d]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Stats bar ── */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Tổng", value: stats.total, cls: "text-slate-700" },
            { label: "Chờ đăng", value: stats.pending, cls: "text-amber-600" },
            { label: "Đã dùng", value: stats.used, cls: "text-green-600" },
            { label: "Bỏ qua", value: stats.skipped, cls: "text-slate-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-slate-100 p-3 text-center"
            >
              <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        {/* Filter */}
        <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-lg p-1 text-xs">
          {["pending", "used", "skipped", ""].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === s
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {s === "" ? "Tất cả" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Upload */}
        <label
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors
            ${uploading ? "opacity-50 pointer-events-none" : "bg-slate-800 text-white hover:bg-slate-700"}`}
        >
          {uploading ? <Spinner /> : <UploadIcon className="w-3.5 h-3.5" />}
          Import xlsx
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
          />
        </label>

        {/* Clear pending */}
        <button
          onClick={handleClearPending}
          disabled={clearing || !stats?.pending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          Xoá pending
        </button>
      </div>

      {/* ── Upload message ── */}
      {uploadMsg && (
        <p className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600">
          {uploadMsg}
        </p>
      )}

      {/* ── Item list ── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Không có item nào. Import file xlsx để bắt đầu.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groupDates.map((dateKey) => {
            const dateItems = groupedByDate[dateKey];
            const pendingCount = dateItems.filter(
              (it) => it.status === "pending",
            ).length;

            return (
              <div
                key={dateKey}
                className="bg-white border border-slate-100 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-700">
                    {formatDate(dateKey)}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                    {dateItems.length} item
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                    {pendingCount} pending
                  </span>
                </div>

                <div className="flex flex-col">
                  {dateItems.map((item, idx) => {
                    console.log(
                      "-item image =>>",
                      JSON.stringify(item.igImageUrl, null, 4),
                    );
                    const isExpanded = !!expandedIds[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`px-4 py-3 ${idx !== dateItems.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 text-center min-w-16">
                            <p className="text-[11px] font-bold text-slate-700 capitalize">
                              {item.slot}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.id.slice(-6)}
                            </p>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <p className="text-[11px] font-semibold text-slate-700 truncate">
                                {item.topicLabel}
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold ml-auto ${STATUS_STYLE[item.status]}`}
                              >
                                {STATUS_LABEL[item.status]}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px] text-slate-500">
                              <p className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                                <span className="font-semibold text-slate-600">
                                  FB:
                                </span>{" "}
                                {previewText(item.fbContent)}
                              </p>
                              <p className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                                <span className="font-semibold text-slate-600">
                                  Threads:
                                </span>{" "}
                                {previewText(item.threadsContent)}
                              </p>
                              <p className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                                <span className="font-semibold text-slate-600">
                                  IG:
                                </span>{" "}
                                {previewText(item.igCaption)}
                              </p>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                              <span>
                                Import: {formatDateTime(item.importedAt)}
                              </span>
                              {item.usedAt && (
                                <span className="text-green-500">
                                  Dùng: {formatDateTime(item.usedAt)}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="mt-2 text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                            >
                              {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}
                            </button>

                            {isExpanded && (
                              <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px] text-slate-600 space-y-2">
                                <div>
                                  <p className="font-semibold text-slate-700 mb-0.5">
                                    Facebook content
                                  </p>
                                  <p className="whitespace-pre-wrap wrap-break-word">
                                    {item.fbContent || "(trống)"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700 mb-0.5">
                                    Threads content
                                  </p>
                                  <p className="whitespace-pre-wrap wrap-break-word">
                                    {item.threadsContent || "(trống)"}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-700 mb-0.5">
                                    Instagram caption
                                  </p>
                                  <p className="whitespace-pre-wrap wrap-break-word">
                                    {item.igCaption || "(trống)"}
                                  </p>
                                </div>

                                <div className="flex  flex-wrap gap-2 text-slate-500">
                                  <span>ID record: {item.recordId || "-"}</span>
                                  <span>Ảnh IG: {item.igImageUrl || "-"}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {item.status === "pending" && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Xem thêm ── */}
          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              Xem thêm ({remaining} mục còn lại)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
