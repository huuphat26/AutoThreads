// ============================================================
// Hook: useFacebookDashboard
// Quản lý toàn bộ state & logic cho Facebook tab:
//  - Compose form (topic, keywords, content, mediaType, imageUrl)
//  - Schedule toggle + datetime picker
//  - AI generate (gọi /api/generate)
//  - Post now / Schedule post (gọi /api/platforms/facebook/schedule)
//  - Danh sách bài đăng FB (fetch từ API)
// ============================================================
"use client";

import { useState, useCallback, useRef } from "react";
import type { FBScheduledPost, FBMediaType } from "@/types";
import { usePuterGenerate } from "@/hooks/use-puter-generate";

export type FBDashboardStats = {
  total: number;
  scheduled: number;
  posted: number;
  failed: number;
  pending: number;
  cancelled: number;
};

const DEFAULT_STATS: FBDashboardStats = {
  total: 0,
  scheduled: 0,
  posted: 0,
  failed: 0,
  pending: 0,
  cancelled: 0,
};

/** Tạo giá trị mặc định cho datetime-local input (+2 giờ tính từ hiện tại) */
function defaultScheduledTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // Format: "YYYY-MM-DDTHH:MM"
  return d.toISOString().slice(0, 16);
}

export function useFacebookDashboard(aiProviderId: string, aiModel: string) {
  // ── Compose form state ──────────────────────────────────────────────────────

  const [keywords, setKeywords] = useState("");
  const [content, setContent] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [mediaType, setMediaType] = useState<FBMediaType>("TEXT");
  const [imageUrl, setImageUrl] = useState("");

  // ── Account state (multi-account) ───────────────────────────────────────────
  const [accountId, setAccountId] = useState<string | undefined>(undefined);

  // ── Schedule state ──────────────────────────────────────────────────────────
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(defaultScheduledTime);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Posts list state ────────────────────────────────────────────────────────
  const [fbPosts, setFbPosts] = useState<FBScheduledPost[]>([]);
  const [fbStats, setFbStats] = useState<FBDashboardStats>(DEFAULT_STATS);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const fetchedOnce = useRef(false);

  // Puter.js hook
  const { generating: puterGenerating, generate: puterGenerate } =
    usePuterGenerate();

  // ── Tải danh sách bài đăng ─────────────────────────────────────────────────
  const fetchFBPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError("");
    try {
      const res = await fetch("/api/platforms/facebook/schedule?limit=50");
      const json = await res.json();
      if (json.success) {
        setFbPosts(json.data.posts as FBScheduledPost[]);
        setFbStats(json.data.stats as FBDashboardStats);
      } else {
        setPostsError(json.error ?? "Không thể tải danh sách bài đăng");
      }
    } catch {
      setPostsError("Không thể kết nối server");
    } finally {
      setPostsLoading(false);
    }
  }, []);

  /** Tự fetch một lần khi đầu tiên được gọi */
  const ensureFetched = useCallback(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchFBPosts();
    }
  }, [fetchFBPosts]);

  // ── Tạo nội dung bằng AI ────────────────────────────────────────────────────
  const handleGenerate = useCallback(
    async (overrideCustomPrompt?: string) => {
      setError("");
      const keywordsArr = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      // Puter.js path
      if (aiProviderId === "puter") {
        try {
          const result = await puterGenerate(
            {
              keywords: keywordsArr,
              customPrompt:
                (typeof overrideCustomPrompt === "string"
                  ? overrideCustomPrompt
                  : customPrompt
                ).trim() || undefined,
            },
            aiModel,
            { onChunk: (acc) => setContent(acc) },
          );
          if (result) setContent(result.fullPost);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Puter.js lỗi không xác định",
          );
        }
        return;
      }

      // Backend path (Gemini / OpenAI)
      setGenerating(true);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: keywordsArr }),
        });
        const json = await res.json();
        if (json.success) {
          setContent(json.data.fullPost);
        } else {
          setError(json.error ?? "Lỗi tạo nội dung");
        }
      } catch {
        setError("Không thể kết nối server");
      } finally {
        setGenerating(false);
      }
    },
    [aiProviderId, aiModel, keywords, customPrompt, puterGenerate],
  );

  // ── Đăng ngay hoặc hẹn giờ ─────────────────────────────────────────────────
  const handlePost = useCallback(async () => {
    const msg = content.trim();
    if (!msg && !(mediaType === "IMAGE" && imageUrl.trim())) {
      setError("Vui lòng nhập nội dung hoặc tạo bằng AI");
      return;
    }
    if (mediaType === "IMAGE" && !imageUrl.trim()) {
      setError("Vui lòng nhập URL hình ảnh");
      return;
    }
    if (isScheduled && !scheduledTime) {
      setError("Vui lòng chọn thời điểm hẹn đăng");
      return;
    }
    if (isScheduled && new Date(scheduledTime).getTime() <= Date.now()) {
      setError("Thời điểm hẹn phải ở trong tương lai");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const body: Record<string, unknown> = {
        message: msg || undefined,
        mediaType,
        imageUrl: mediaType === "IMAGE" ? imageUrl.trim() : undefined,
        scheduledAt: isScheduled
          ? new Date(scheduledTime).toISOString()
          : undefined,
        accountId,
      };

      const res = await fetch("/api/platforms/facebook/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        const post = json.data as FBScheduledPost;
        if (post.status === "posted") {
          setSuccess(
            `✅ Đã đăng lên Facebook!${post.fbPermalinkUrl ? ` — ${post.fbPermalinkUrl}` : ""}`,
          );
        } else if (post.status === "scheduled") {
          const time = new Date(post.scheduledAt).toLocaleString("vi-VN");
          setSuccess(`📅 Đã hẹn lịch đăng lúc ${time}`);
        }
        // Reset form
        setContent("");
        setImageUrl("");
        setIsScheduled(false);
        setScheduledTime(defaultScheduledTime());
        // Refresh danh sách
        fetchFBPosts();
      } else {
        setError(json.error ?? "Đăng bài thất bại");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }, [content, mediaType, imageUrl, isScheduled, scheduledTime, fetchFBPosts]);

  // ── Hủy bài hẹn giờ ────────────────────────────────────────────────────────
  const handleCancelPost = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/platforms/facebook/schedule?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        const json = await res.json();
        if (json.success) {
          fetchFBPosts();
        } else {
          setError(json.error ?? "Không thể hủy bài đăng");
        }
      } catch {
        setError("Không thể kết nối server");
      }
    },
    [fetchFBPosts],
  );

  return {
    // Compose
    keywords,
    setKeywords,
    content,
    setContent,
    customPrompt,
    setCustomPrompt,
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    // Schedule
    isScheduled,
    setIsScheduled,
    scheduledTime,
    setScheduledTime,
    // UI
    generating: aiProviderId === "puter" ? puterGenerating : generating,
    loading,
    error,
    success,
    // Posts list
    fbPosts,
    fbStats,
    postsLoading,
    postsError,
    fetchFBPosts,
    ensureFetched,
    // Actions
    handleGenerate,
    handlePost,
    handleCancelPost,
    // Account (multi-account)
    accountId,
    setAccountId,
  };
}
