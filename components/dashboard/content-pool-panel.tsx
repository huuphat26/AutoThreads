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
import { AccountSelector } from "./account-selector";

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ đăng",
  used: "Đã dùng",
  skipped: "Bỏ qua",
};

const PAGE_SIZE = 5;

interface ImportPreviewRow {
  row: number;
  date: string;
  slot: string;
  topicLabel: string;
  hasImageUrl: boolean;
  hasImagePrompt: boolean;
}

interface ImportRowError {
  row: number;
  message: string;
}

interface ImportDryRunData {
  totalRows: number;
  validRows: number;
  added: number;
  updated: number;
  skipped: number;
  previewRows: ImportPreviewRow[];
  rowErrors: ImportRowError[];
}

const SLOT_LABEL: Record<string, string> = {
  morning: "Sáng",
  lunch: "Trưa",
  evening: "Tối",
};

export function ContentPoolPanel() {
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [accountId, setAccountId] = useState<string>("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dryRunData, setDryRunData] = useState<ImportDryRunData | null>(null);
  const [dryRunning, setDryRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const wizardFileRef = useRef<HTMLInputElement>(null);

  const {
    data,
    loading,
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
    refreshAll,
    handleClearPending,
    handleDelete,
    handleBulkGenerate,
  } = useContentPool(filterStatus, accountId || undefined);

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedFile(null);
    setDryRunData(null);
    setDryRunning(false);
    setImporting(false);
  };

  const goBackWizard = () => {
    if (wizardStep === 3) {
      setWizardStep(2);
      return;
    }
    setWizardStep(1);
  };

  const handleSelectWizardFile = () => {
    wizardFileRef.current?.click();
  };

  const handleWizardFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setDryRunData(null);
    setWizardStep(2);
    e.target.value = "";
  };

  const handleDryRunImport = async () => {
    if (!selectedFile) return;

    setDryRunning(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      if (accountId) form.append("accountId", accountId);
      form.append("dryRun", "1");

      const res = await fetch("/api/content-pool/import-xlsx", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (json.success) {
        setDryRunData(json.data as ImportDryRunData);
        setWizardStep(3);
      } else {
        setUploadMsg(`❌ Lỗi dry-run: ${json.error}`);
      }
    } catch {
      setUploadMsg("❌ Không thể dry-run file import");
    } finally {
      setDryRunning(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      if (accountId) form.append("accountId", accountId);

      const res = await fetch("/api/content-pool/import-xlsx", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (json.success) {
        const { added, updated, skipped, rowErrors } = json.data as {
          added: number;
          updated: number;
          skipped: number;
          rowErrors?: ImportRowError[];
        };
        setUploadMsg(
          `✅ Import thành công: +${added} mới, ~${updated} cập nhật, ${skipped} bỏ qua` +
            ((rowErrors?.length ?? 0) > 0
              ? ` | ⚠️ ${rowErrors?.length} lỗi dòng`
              : ""),
        );
        await refreshAll();
        resetWizard();
      } else {
        setUploadMsg(`❌ Lỗi import: ${json.error}`);
      }
    } catch {
      setUploadMsg("❌ Không thể import file");
    } finally {
      setImporting(false);
    }
  };

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

      <AccountSelector value={accountId} onChange={setAccountId} />

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

        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          <UploadIcon className="w-3.5 h-3.5" />
          Import Wizard
        </button>
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

      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Import Sheet 3 bước
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn tài khoản → Dry-run preview → Xác nhận import
                  </p>
                </div>
                <button
                  onClick={resetWizard}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600"
                >
                  Đóng
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px]">
                {[1, 2, 3].map((s) => {
                  const active = wizardStep === s;
                  const done = wizardStep > s;
                  return (
                    <span
                      key={s}
                      className={`px-2.5 py-1 rounded-md border ${
                        active
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      Bước {s}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Bước 1: Chọn tài khoản import
                  </p>
                  <p className="text-xs text-slate-500">
                    Dữ liệu sẽ được gắn theo tài khoản này để tránh chồng chéo
                    giữa nhiều account.
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <AccountSelector
                      value={accountId}
                      onChange={setAccountId}
                    />
                    <p className="mt-2 text-[11px] text-slate-500">
                      {accountId
                        ? `Đang chọn account: ${accountId}`
                        : "Đang dùng account mặc định (env-default)."}
                    </p>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Bước 2: Chọn file và chạy dry-run
                  </p>
                  <p className="text-xs text-slate-500">
                    Dry-run chỉ parse/validate và dự báo add-update-skip, chưa
                    ghi dữ liệu.
                  </p>

                  <input
                    ref={wizardFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleWizardFileChange}
                  />

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleSelectWizardFile}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700"
                    >
                      Chọn file .xlsx
                    </button>
                    <p className="text-xs text-slate-600">
                      {selectedFile
                        ? `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`
                        : "Chưa chọn file"}
                    </p>
                  </div>

                  {dryRunning && (
                    <div className="flex items-center gap-2 text-xs text-violet-600">
                      <Spinner />
                      Đang dry-run file import...
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 3 && dryRunData && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Bước 3: Preview kết quả trước khi import
                    </p>
                    <p className="text-xs text-slate-500">
                      Kiểm tra summary, các dòng hợp lệ và bảng lỗi theo từng
                      dòng.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-[10px] text-slate-400">Tổng dòng</p>
                      <p className="text-sm font-bold text-slate-700">
                        {dryRunData.totalRows}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
                      <p className="text-[10px] text-blue-500">Hợp lệ</p>
                      <p className="text-sm font-bold text-blue-700">
                        {dryRunData.validRows}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                      <p className="text-[10px] text-emerald-500">Thêm mới</p>
                      <p className="text-sm font-bold text-emerald-700">
                        {dryRunData.added}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                      <p className="text-[10px] text-amber-600">Cập nhật</p>
                      <p className="text-sm font-bold text-amber-700">
                        {dryRunData.updated}
                      </p>
                    </div>
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-2">
                      <p className="text-[10px] text-rose-500">Bị bỏ qua</p>
                      <p className="text-sm font-bold text-rose-700">
                        {dryRunData.skipped}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-700">
                        Preview dòng hợp lệ (tối đa 20 dòng)
                      </p>
                    </div>
                    {dryRunData.previewRows.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-slate-500">
                        Không có dòng hợp lệ để import.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">
                                Row
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                Ngày
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                Slot
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                Topic
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                IG ảnh
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dryRunData.previewRows.map((row) => (
                              <tr
                                key={`${row.row}-${row.topicLabel}`}
                                className="border-t border-slate-100"
                              >
                                <td className="px-3 py-2 text-slate-600">
                                  {row.row}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {row.date}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {SLOT_LABEL[row.slot] ?? row.slot}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {row.topicLabel}
                                </td>
                                <td className="px-3 py-2 text-slate-600">
                                  {row.hasImageUrl
                                    ? "Có URL"
                                    : row.hasImagePrompt
                                      ? "Có prompt"
                                      : "Thiếu"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-rose-200 overflow-hidden">
                    <div className="px-3 py-2 bg-rose-50 border-b border-rose-200">
                      <p className="text-xs font-semibold text-rose-700">
                        Bảng lỗi theo dòng ({dryRunData.rowErrors.length})
                      </p>
                    </div>
                    {dryRunData.rowErrors.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-emerald-600">
                        Không phát hiện lỗi format.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-rose-50 text-rose-600">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">
                                Row
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                Mô tả lỗi
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dryRunData.rowErrors.map((err) => (
                              <tr
                                key={`${err.row}-${err.message}`}
                                className="border-t border-rose-100"
                              >
                                <td className="px-3 py-2 text-rose-700">
                                  {err.row}
                                </td>
                                <td className="px-3 py-2 text-rose-700">
                                  {err.message}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
              <button
                onClick={resetWizard}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Huỷ
              </button>

              <div className="flex items-center gap-2">
                {wizardStep > 1 && (
                  <button
                    onClick={goBackWizard}
                    disabled={dryRunning || importing}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Quay lại
                  </button>
                )}

                {wizardStep === 1 && (
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700"
                  >
                    Tiếp tục
                  </button>
                )}

                {wizardStep === 2 && (
                  <button
                    onClick={handleDryRunImport}
                    disabled={!selectedFile || dryRunning}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {dryRunning ? "Đang phân tích..." : "Dry-run preview"}
                  </button>
                )}

                {wizardStep === 3 && (
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || !selectedFile}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {importing ? "Đang import..." : "Xác nhận import"}
                  </button>
                )}
              </div>
            </div>
          </div>
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
