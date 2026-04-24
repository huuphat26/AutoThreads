// ============================================================
// Hook: useInstagramDashboard
// Quản lý toàn bộ state & logic cho Instagram tab:
//  - Compose form (topic, keywords, caption, mediaType, imageUrl/videoUrl)
//  - Schedule toggle + datetime picker
//  - AI generate caption (gọi /api/generate)
//  - Post now / Schedule post (gọi /api/platforms/instagram/schedule)
//  - Danh sách bài đăng IG (fetch từ API)
//
// Đặc điểm Instagram:
//  - Không có text-only post — phải có imageUrl hoặc videoUrl
//  - Tạo caption bằng AI rồi gắn vào ảnh/video
// ============================================================
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { IGScheduledPost, IGScheduleMediaType } from "@/types";
import { usePuterGenerate } from "@/hooks/use-puter-generate";

export type IGDashboardStats = {
  total: number;
  scheduled: number;
  posted: number;
  failed: number;
  pending: number;
  cancelled: number;
};

const DEFAULT_STATS: IGDashboardStats = {
  total: 0,
  scheduled: 0,
  posted: 0,
  failed: 0,
  pending: 0,
  cancelled: 0,
};

function defaultScheduledTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function useInstagramDashboard(aiProviderId: string, aiModel: string) {
  // ── Compose form state ──────────────────────────────────────────────────────

  const [keywords, setKeywords] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState<IGScheduleMediaType>("IMAGE");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);

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
  const [igPosts, setIgPosts] = useState<IGScheduledPost[]>([]);
  const [igStats, setIgStats] = useState<IGDashboardStats>(DEFAULT_STATS);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const fetchedOnce = useRef(false);

  const { generating: puterGenerating, generate: puterGenerate } =
    usePuterGenerate();

  // ── Tải danh sách bài đăng ─────────────────────────────────────────────────
  const fetchIGPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (accountId) params.set("accountId", accountId);
      const res = await fetch(
        `/api/platforms/instagram/schedule?${params.toString()}`,
      );
      const json = await res.json();
      if (json.success) {
        setIgPosts(json.data.posts as IGScheduledPost[]);
        setIgStats(json.data.stats as IGDashboardStats);
      } else {
        setPostsError(json.error ?? "Không thể tải danh sách bài đăng");
      }
    } catch {
      setPostsError("Không thể kết nối server");
    } finally {
      setPostsLoading(false);
    }
  }, [accountId]);

  const ensureFetched = useCallback(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchIGPosts();
    }
  }, [fetchIGPosts]);

  useEffect(() => {
    if (fetchedOnce.current) {
      fetchIGPosts();
    }
  }, [accountId, fetchIGPosts]);

  // ── Tạo caption bằng AI ─────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setError("");
    const keywordsArr = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (aiProviderId === "puter") {
      try {
        const result = await puterGenerate({ keywords: keywordsArr }, aiModel, {
          onChunk: (acc) => setCaption(acc),
        });
        if (result) setCaption(result.fullPost);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Puter.js lỗi không xác định",
        );
      }
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keywordsArr }),
      });
      const json = await res.json();
      if (json.success) {
        setCaption(json.data.fullPost);
      } else {
        setError(json.error ?? "Lỗi tạo nội dung");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setGenerating(false);
    }
  }, [aiProviderId, aiModel, keywords, puterGenerate]);

  // ── Validate media URL ──────────────────────────────────────────────────────
  const validateMedia = (): string | null => {
    if (mediaType === "IMAGE" && !imageUrl.trim()) {
      return "Vui lòng nhập URL hình ảnh công khai (HTTPS)";
    }
    if (mediaType === "REELS" && !videoUrl.trim()) {
      return "Vui lòng nhập URL video công khai (MP4)";
    }
    return null;
  };

  // ── Đăng ngay hoặc hẹn giờ ─────────────────────────────────────────────────
  const handlePost = useCallback(async () => {
    const mediaErr = validateMedia();
    if (mediaErr) {
      setError(mediaErr);
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
        caption: caption.trim() || undefined,
        mediaType,
        imageUrl: mediaType === "IMAGE" ? imageUrl.trim() : undefined,
        videoUrl: mediaType === "REELS" ? videoUrl.trim() : undefined,
        shareToFeed: mediaType === "REELS" ? shareToFeed : undefined,
        scheduledAt: isScheduled
          ? new Date(scheduledTime).toISOString()
          : undefined,
        accountId,
      };

      const res = await fetch("/api/platforms/instagram/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        const post = json.data as IGScheduledPost;
        if (post.status === "posted") {
          setSuccess(
            `✅ Đã đăng lên Instagram!${post.igPermalinkUrl ? ` — ${post.igPermalinkUrl}` : ""}`,
          );
        } else if (post.status === "scheduled") {
          const time = new Date(post.scheduledAt).toLocaleString("vi-VN");
          setSuccess(`📅 Đã hẹn lịch đăng lúc ${time}`);
        }
        setCaption("");
        setImageUrl("");
        setVideoUrl("");
        setIsScheduled(false);
        setScheduledTime(defaultScheduledTime());
        fetchIGPosts();
      } else {
        setError(json.error ?? "Đăng bài thất bại");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    caption,
    mediaType,
    imageUrl,
    videoUrl,
    shareToFeed,
    isScheduled,
    scheduledTime,
    fetchIGPosts,
    accountId,
  ]);

  // ── Hủy bài hẹn giờ ────────────────────────────────────────────────────────
  const handleCancelPost = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/platforms/instagram/schedule?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        const json = await res.json();
        if (json.success) {
          fetchIGPosts();
        } else {
          setError(json.error ?? "Không thể hủy bài đăng");
        }
      } catch {
        setError("Không thể kết nối server");
      }
    },
    [fetchIGPosts],
  );

  return {
    // Compose
    keywords,
    setKeywords,
    caption,
    setCaption,
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    shareToFeed,
    setShareToFeed,
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
    igPosts,
    igStats,
    postsLoading,
    postsError,
    fetchIGPosts,
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
