"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContentPoolItem } from "@/types";
import { uploadImageToCloud } from "@/lib/cloudinary-upload";

// ── Types ──────────────────────────────────────────────────────
export interface PoolStats {
  total: number;
  pending: number;
  used: number;
  skipped: number;
  lastUpdated: string;
}

export interface PoolData {
  stats: PoolStats;
  items: ContentPoolItem[];
}

export interface BulkProgress {
  current: number;
  total: number;
  errors: string[];
}

// ── Fallback model list for image generation ───────────────────
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
      return await uploadImageToCloud(img.src);
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    lastErr instanceof Error ? lastErr.message : "Tất cả model đều lỗi",
  );
}

// ── Hook ───────────────────────────────────────────────────────
export function useContentPool(filterStatus: string, accountId?: string) {
  const [data, setData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const [allPending, setAllPending] = useState<ContentPoolItem[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  const autoStartedRef = useRef(false);

  // ── Today in VN timezone ─────────────────────────────────────
  const todayVN = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  // ── Fetch paginated items ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (accountId) params.set("accountId", accountId);
      const query = params.toString();
      const url = `/api/content-pool${query ? `?${query}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, accountId]);

  // ── Fetch all pending items (for bulk gen & stats) ───────────
  const fetchAllPending = useCallback(async () => {
    const params = new URLSearchParams({ status: "pending" });
    if (accountId) params.set("accountId", accountId);
    const res = await fetch(`/api/content-pool?${params.toString()}`);
    const json = await res.json();
    if (json.success) setAllPending(json.data.items ?? []);
  }, [accountId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchData(), fetchAllPending()]);
  }, [fetchData, fetchAllPending]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ── Bulk image generation ────────────────────────────────────
  const todayItemsNeedingImages = allPending.filter(
    (item) => item.date === todayVN && item.imagePrompt && !item.igImageUrl,
  );

  const handleBulkGenerate = useCallback(
    async (items: ContentPoolItem[]) => {
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
            p ? { ...p, errors: [...p.errors, item.topicLabel || item.id] } : p,
          );
        }
        setBulkProgress((p) => (p ? { ...p, current: i + 1 } : p));
      }

      setBulkGenerating(false);
      await fetchAllPending();
      await fetchData();
    },
    [fetchAllPending, fetchData],
  );

  // ── Auto-start on mount if today has items needing images ────
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
  }, [todayItemsNeedingImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload xlsx ──────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);

    const form = new FormData();
    form.append("file", file);
    if (accountId) form.append("accountId", accountId);
    e.target.value = "";

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
        await fetchAllPending();
      } else {
        setUploadMsg(`❌ Lỗi: ${json.error}`);
      }
    } catch {
      setUploadMsg("❌ Lỗi kết nối");
    } finally {
      setUploading(false);
    }
  };

  // ── Clear pending ────────────────────────────────────────────
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
        await fetchAllPending();
      }
    } finally {
      setClearing(false);
    }
  };

  // ── Delete one item ──────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await fetch(`/api/content-pool?id=${id}`, { method: "DELETE" });
    await fetchData();
    await fetchAllPending();
  };

  return {
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
    refreshAll,
    handleUpload,
    handleClearPending,
    handleDelete,
    handleBulkGenerate,
  };
}
