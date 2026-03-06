"use client";

import { useRef, useState } from "react";
import { UploadIcon, TrashIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useContentPool } from "./content-pool/use-content-pool";
import { PoolStatsBar } from "./content-pool/pool-stats-bar";
import { ItemListSkeleton } from "./content-pool/pool-skeleton";
import {
  BulkNeedsBanner,
  BulkProgressBar,
  BulkSummary,
} from "./content-pool/pool-bulk-banner";
import { PoolDateGroup } from "./content-pool/pool-item-card";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ đăng",
  used: "Đã dùng",
  skipped: "Bỏ qua",
};

const PAGE_SIZE = 5;

export function ContentPoolPanel() {
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    data,
    loading,
    uploading,
    clearing,
    uploadMsg,
    setUploadMsg,
    allPending,
    todayVN,
    todayItemsNeedingImages,
    bulkGenerating,
    bulkProgress,
    setBulkProgress,
    fetchData,
    handleUpload,
    handleClearPending,
    handleDelete,
    handleBulkGenerate,
  } = useContentPool(filterStatus);

  const stats = data?.stats;
  const items = data?.items ?? [];

  const allDates = [...new Set(items.map((i) => i.date))].sort((a, b) =>
    a.localeCompare(b),
  );

  const flatItems = allDates.flatMap((d) => items.filter((i) => i.date === d));
  const visibleItems = flatItems.slice(0, visibleCount);
  const hasMore = visibleCount < flatItems.length;
  const remaining = flatItems.length - visibleCount;

  const groupedByDate = visibleItems.reduce<
    Record<string, typeof visibleItems>
  >((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});
  const visibleDates = allDates.filter((d) => !!groupedByDate[d]);

  return (
    <div className="flex flex-col gap-4">
      {!bulkGenerating && (
        <BulkNeedsBanner
          items={todayItemsNeedingImages}
          onGenerate={handleBulkGenerate}
        />
      )}
      {bulkGenerating && bulkProgress && (
        <BulkProgressBar progress={bulkProgress} />
      )}
      {!bulkGenerating && bulkProgress && (
        <BulkSummary
          progress={bulkProgress}
          onDismiss={() => setBulkProgress(null)}
        />
      )}

      <PoolStatsBar
        stats={stats}
        allPending={allPending}
        todayVN={todayVN}
        loading={loading}
      />

      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-lg p-1 text-xs">
          {(["pending", "used", "skipped", ""] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => {
                setFilterStatus(s);
                setVisibleCount(PAGE_SIZE);
              }}
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

        <label
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
            uploading
              ? "opacity-50 pointer-events-none bg-slate-800 text-white"
              : "bg-slate-800 text-white hover:bg-slate-700"
          }`}
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
        <button
          onClick={handleClearPending}
          disabled={clearing || !stats?.pending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          Xoá pending
        </button>
      </div>

      {uploadMsg && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
          <p className="text-xs text-slate-600">{uploadMsg}</p>
          <button
            onClick={() => setUploadMsg(null)}
            className="text-[10px] text-slate-400 hover:text-slate-600 ml-4 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <ItemListSkeleton />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Không có item nào. Import file xlsx để bắt đầu.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleDates.map((dateKey) => (
            <PoolDateGroup
              key={dateKey}
              dateKey={dateKey}
              items={groupedByDate[dateKey]}
              onDelete={handleDelete}
              onRefresh={fetchData}
            />
          ))}

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
