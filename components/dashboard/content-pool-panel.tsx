"use client";

// ================================================================
// ContentPoolPanel
// Hiển thị danh sách content pool + upload xlsx + xoá
// ================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { ContentPoolItem } from "@/types";
import { UploadIcon, TrashIcon, PhotoIcon, SparklesIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { usePuterImageGenerate } from "@/hooks/use-puter-image-generate";
import { uploadImageToCloud } from "@/lib/cloudinary-upload";

// ── Sub-component: tạo ảnh AI cho 1 pool item ───────────────────
function PoolItemImageGen({
  item,
  onSaved,
}: {
  item: ContentPoolItem;
  onSaved: () => void;
}) {
  const { generating, uploading, imageUrl, error, usedModel, generate, reset, PUTER_IMAGE_MODELS } =
    usePuterImageGenerate();
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(item.igImageUrl ?? "");
  const [selectedModel, setSelectedModel] = useState<string>(PUTER_IMAGE_MODELS[0]);

  if (!item.imagePrompt) return null;

  const handleGenerate = () => generate(item.imagePrompt!, selectedModel);

  const handleSave = async (url: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/content-pool", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, igImageUrl: url }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedUrl(url);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const isBlob = false; // Cloudinary đã upload xong, luôn là HTTPS URL

  return (
    <div className="mt-2 border border-violet-100 rounded-lg bg-violet-50/40 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <SparklesIcon className="w-3 h-3 text-violet-500" />
        <p className="text-[10px] font-semibold text-violet-700">Image Prompt (AI)</p>
      </div>
      <p className="text-[10px] text-slate-500 italic leading-relaxed">
        {item.imagePrompt}
      </p>

      {/* Model selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-slate-500 shrink-0">Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={generating || uploading}
          className="text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:opacity-50"
        >
          {PUTER_IMAGE_MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-[9px] text-slate-400 italic">
          (tự thử model tiếp theo nếu lỗi)
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating || uploading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {generating || uploading ? (
            <Spinner />
          ) : (
            <PhotoIcon className="w-3 h-3" />
          )}
          {generating ? "Puter đang tạo ảnh..." : uploading ? "Đang upload Cloudinary..." : "Tạo ảnh AI"}
        </button>

        {imageUrl && (
          <button
            onClick={reset}
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Xoá
          </button>
        )}

        {usedModel && imageUrl && (
          <span className="text-[9px] text-violet-500 italic">
            ✓ {usedModel} → Cloudinary
          </span>
        )}

        {savedUrl && !imageUrl && (
          <span className="text-[10px] text-green-600 font-medium">
            ✓ Đã lưu ảnh IG
          </span>
        )}
      </div>

      {error && (
        <p className="text-[10px] text-red-500">{error}</p>
      )}

      {imageUrl && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="AI generated"
            className="rounded-lg w-full max-h-48 object-cover border border-violet-200"
          />
          <div className="flex gap-2 flex-wrap">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors"
            >
              Xem ảnh
            </a>
            <button
              onClick={() => handleSave(imageUrl)}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Spinner /> : null}
              Lưu làm ảnh IG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Standalone: tạo ảnh với fallback model (không cần React state) ─
const FALLBACK_MODELS = [
  "dall-e-3",
  "gpt-image-1",
  "gpt-image-1.5",
  "gpt-image-1-mini",
  "dall-e-2",
] as const;

async function puterGenerateWithFallback(
  puter: NonNullable<Window["puter"]>,
  prompt: string,
): Promise<string> {
  let lastErr: unknown;
  for (const model of FALLBACK_MODELS) {
    try {
      const img = await puter.ai.txt2img(prompt, { model });
      // Upload lên Cloudinary — lấy HTTPS public URL
      const cloudUrl = await uploadImageToCloud(img.src);
      return cloudUrl;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    lastErr instanceof Error ? lastErr.message : "Tất cả model đều lỗi",
  );
}

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

  // ── Bulk image generation ──────────────────────────────────
  const [allPending, setAllPending] = useState<ContentPoolItem[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    errors: string[];
  } | null>(null);
  // Tránh auto-start chạy nhiều lần
  const autoStartedRef = useRef(false);

  const fetchAllPending = useCallback(async () => {
    const res = await fetch("/api/content-pool?status=pending");
    const json = await res.json();
    if (json.success) setAllPending(json.data.items ?? []);
  }, []);

  /** Item hôm nay (VN timezone) có imagePrompt nhưng chưa có igImageUrl */
  const todayVN = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const todayItemsNeedingImages = allPending.filter(
    (item) => item.date === todayVN && item.imagePrompt && !item.igImageUrl,
  );

  const handleBulkGenerate = useCallback(async (items: ContentPoolItem[]) => {
    const puter = typeof window !== "undefined" ? window.puter : undefined;
    if (!puter || items.length === 0) return;

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: items.length, errors: [] });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const url = await puterGenerateWithFallback(puter, item.imagePrompt!);
        await fetch("/api/content-pool", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, igImageUrl: url }),
        });
      } catch {
        setBulkProgress((p) =>
          p
            ? { ...p, errors: [...p.errors, item.topicLabel || item.id] }
            : p,
        );
      }
      setBulkProgress((p) => (p ? { ...p, current: i + 1 } : p));
    }

    setBulkGenerating(false);
    await fetchAllPending();
    await fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAllPending]);

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
    fetchAllPending();
  }, [fetchData, fetchAllPending]);

  // ── Auto-start: tự tạo ảnh khi mở trang nếu còn item thiếu ảnh ──
  useEffect(() => {
    if (
      autoStartedRef.current ||
      bulkGenerating ||
      todayItemsNeedingImages.length === 0
    )
      return;
    const puter = typeof window !== "undefined" ? window.puter : undefined;
    if (!puter) return;
    autoStartedRef.current = true;
    handleBulkGenerate(todayItemsNeedingImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayItemsNeedingImages.length]);

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
      {/* ── Banner: item hôm nay chưa có ảnh IG ── */}
      {todayItemsNeedingImages.length > 0 && !bulkGenerating && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex-1 text-[11px] text-amber-800">
            <span className="font-bold">
              ⚠️ {todayItemsNeedingImages.length} item hôm nay
            </span>{" "}
            chưa có ảnh — đang chuẩn bị tạo tự động trước giờ đăng.
          </div>
          <button
            onClick={() => handleBulkGenerate(todayItemsNeedingImages)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
          >
            <SparklesIcon className="w-3 h-3" />
            Tạo ngay ({todayItemsNeedingImages.length})
          </button>
        </div>
      )}

      {/* ── Bulk progress ── */}
      {bulkGenerating && bulkProgress && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Spinner />
            <span className="text-[11px] text-violet-700 font-semibold">
              Đang tạo ảnh {bulkProgress.current}/{bulkProgress.total}…
            </span>
          </div>
          <div className="w-full bg-violet-100 rounded-full h-1.5">
            <div
              className="bg-violet-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${bulkProgress.total > 0
                  ? Math.round(
                    (bulkProgress.current / bulkProgress.total) * 100,
                  )
                  : 0
                  }%`,
              }}
            />
          </div>
          {bulkProgress.errors.length > 0 && (
            <p className="text-[10px] text-red-500">
              ⚠️ Lỗi: {bulkProgress.errors.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Sau khi bulk xong: tóm tắt */}
      {!bulkGenerating && bulkProgress && bulkProgress.current > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-green-700">
            ✅ Hoàn tất:{" "}
            <strong>{bulkProgress.current - bulkProgress.errors.length}</strong> ảnh đã lưu
            {bulkProgress.errors.length > 0 && (
              <span className="text-red-500">
                {" "}| ⚠️ {bulkProgress.errors.length} lỗi
              </span>
            )}
          </span>
          <button
            onClick={() => setBulkProgress(null)}
            className="text-[10px] text-slate-400 hover:text-slate-600"
          >
            Ẩn
          </button>
        </div>
      )}

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
                            <p className="text-[11px] font-bold text-slate-700">
                              {item.slot === "morning" ? "Sáng" : item.slot === "noon" ? "Trưa" : "Tối"}
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
                                  <span>Ảnh (FB/Threads/IG): {item.igImageUrl || "-"}</span>
                                </div>

                                <PoolItemImageGen
                                  item={item}
                                  onSaved={fetchData}
                                />
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
