// ============================================
// Hook: useDashboard — toàn bộ state & logic
// ============================================
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ScheduledPost,
  ThreadsPost,
  ProviderInfo,
  SchedulerStatus,
  ThreadsManualPost,
  ThreadsManualMediaType,
} from "@/types";
import { usePuterGenerate } from "@/hooks/use-puter-generate";

export type DashboardStats = {
  total: number;
  posted: number;
  failed: number;
  pending: number;
  draft: number;
};

/** Tạo giá trị mặc định cho datetime-local input (+2 giờ tính từ hiện tại) */
function defaultScheduledTime(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export type ThreadsManualDashboardStats = {
  total: number;
  scheduled: number;
  posted: number;
  failed: number;
  pending: number;
  cancelled: number;
};

const DEFAULT_MANUAL_STATS: ThreadsManualDashboardStats = {
  total: 0,
  scheduled: 0,
  posted: 0,
  failed: 0,
  pending: 0,
  cancelled: 0,
};

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    posted: 0,
    failed: 0,
    pending: 0,
    draft: 0,
  });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Compose form state
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [mediaType, setMediaType] = useState<ThreadsManualMediaType>("TEXT");
  const [imageUrl, setImageUrl] = useState("");

  // Account state (multi-account)
  const [accountId, setAccountId] = useState<string | undefined>(undefined);

  // Schedule state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(defaultScheduledTime);

  // Manual posts state
  const [manualPosts, setManualPosts] = useState<ThreadsManualPost[]>([]);
  const [manualPostsStats, setManualPostsStats] =
    useState<ThreadsManualDashboardStats>(DEFAULT_MANUAL_STATS);
  const [manualPostsLoading, setManualPostsLoading] = useState(false);
  const [manualPostsError, setManualPostsError] = useState("");
  const manualFetchedOnce = useRef(false);

  // AI Provider state
  const [aiProvider, setAIProvider] = useState<ProviderInfo>({
    id: "puter",
    label: "Puter.js (Free OpenAI)",
    model: "gpt-5.2",
    models: ["gpt-4o-mini", "gpt-5.2"],
    available: true,
  });
  const [aiProviders, setAIProviders] = useState<ProviderInfo[]>([]);

  // Scheduler state
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerStatus | null>(null);

  // Threads API posts state
  const [threadsPosts, setThreadsPosts] = useState<ThreadsPost[]>([]);
  const [threadsTotal, setThreadsTotal] = useState(0);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [threadsError, setThreadsError] = useState("");

  // Puter.js generate hook — tách riêng, không đụng logic backend
  const { generating: puterGenerating, generate: puterGenerate } =
    usePuterGenerate();

  // Live refresh state
  const REFRESH_INTERVAL = 15;
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(REFRESH_INTERVAL);

  // ── Fetch AI config ──
  const fetchAIConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-config");
      const json = await res.json();
      if (json.success) {
        setAIProvider(json.data.current as ProviderInfo);
        setAIProviders(json.data.providers as ProviderInfo[]);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Fetch scheduler status ──
  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      const json = await res.json();
      if (json.success) {
        setSchedulerStatus(json.data as SchedulerStatus);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Switch AI provider ──
  const handleProviderChange = useCallback(
    async (providerId: string) => {
      try {
        const res = await fetch("/api/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerId }),
        });
        const json = await res.json();
        if (json.success) {
          await fetchAIConfig();
        } else {
          setError(json.error || "Không thể đổi AI provider");
        }
      } catch {
        setError("Không thể kết nối server");
      }
    },
    [fetchAIConfig],
  );

  // ── Switch model within a provider ──
  const handleModelChange = useCallback(
    async (providerId: string, model: string) => {
      try {
        const res = await fetch("/api/ai-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: providerId, model }),
        });
        const json = await res.json();
        if (json.success) {
          await fetchAIConfig();
        } else {
          setError(json.error || "Không thể đổi model");
        }
      } catch {
        setError("Không thể kết nối server");
      }
    },
    [fetchAIConfig],
  );

  // ── Fetch history ──
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const json = await res.json();
      if (json.success) {
        setPosts(json.data.posts);
        setStats(json.data.stats);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Fetch manual scheduled posts ──
  const fetchManualPosts = useCallback(async () => {
    setManualPostsLoading(true);
    setManualPostsError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (accountId) params.set("accountId", accountId);
      const res = await fetch(
        `/api/platforms/threads/schedule?${params.toString()}`,
      );
      const json = await res.json();
      if (json.success) {
        setManualPosts(json.data.posts as ThreadsManualPost[]);
        setManualPostsStats(json.data.stats as ThreadsManualDashboardStats);
      } else {
        setManualPostsError(
          json.error ?? "Không thể tải danh sách bài hẹn giờ",
        );
      }
    } catch {
      setManualPostsError("Không thể kết nối server");
    } finally {
      setManualPostsLoading(false);
    }
  }, [accountId]);

  /** Tự fetch manual posts một lần khi component mount */
  const ensureManualFetched = useCallback(() => {
    if (!manualFetchedOnce.current) {
      manualFetchedOnce.current = true;
      fetchManualPosts();
    }
  }, [fetchManualPosts]);

  // ── Hủy bài hẹn giờ ──
  const handleCancelManualPost = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/platforms/threads/schedule?id=${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          },
        );
        const json = await res.json();
        if (json.success) {
          await fetchManualPosts();
        }
      } catch {
        /* silent */
      }
    },
    [fetchManualPosts],
  );

  // ── Fetch tất cả bài đăng từ Threads API ──
  const fetchThreadsPosts = useCallback(async () => {
    setThreadsLoading(true);
    setThreadsError("");
    try {
      const params = new URLSearchParams({
        all: "true",
        pageSize: "50",
        maxPages: "20",
      });
      if (accountId) params.set("accountId", accountId);
      const res = await fetch(`/api/threads/recent?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setThreadsPosts(json.data.posts as ThreadsPost[]);
        setThreadsTotal(json.data.total as number);
      } else {
        setThreadsError(json.error || "Không thể tải bài đăng từ Threads");
      }
    } catch {
      setThreadsError("Không thể kết nối server");
    } finally {
      setThreadsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (manualFetchedOnce.current) {
      fetchManualPosts();
    }
  }, [accountId, fetchManualPosts]);

  useEffect(() => {
    const doRefresh = async () => {
      await Promise.all([
        fetchHistory(),
        fetchSchedulerStatus(),
        fetchAIConfig(),
      ]);
      setLastRefreshed(new Date());
      countdownRef.current = REFRESH_INTERVAL;
      setCountdown(REFRESH_INTERVAL);
    };

    doRefresh();
    const refreshId = setInterval(doRefresh, REFRESH_INTERVAL * 1000);
    const tickId = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1);
      setCountdown(countdownRef.current);
    }, 1000);
    return () => {
      clearInterval(refreshId);
      clearInterval(tickId);
    };
  }, [fetchHistory, fetchSchedulerStatus, fetchAIConfig]);

  // ── Chạy bài đăng bị bỏ lỡ (slot đã qua mà server chưa chạy) ──
  const handleRunMissedSlot = useCallback(async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setSuccess("Đã kích hoạt đăng bài cho khung giờ bị bỏ lỡ!");
        await fetchHistory();
        await fetchSchedulerStatus();
      } else {
        setError(json.error || "Không thể chạy bài đăng");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  }, [fetchHistory, fetchSchedulerStatus]);

  // ── Bỏ qua slot — không nhắc lại và không đăng trong ngày ──
  const handleSkipSlot = useCallback(async (slotId: string) => {
    try {
      const res = await fetch("/api/scheduler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip", slotId }),
      });
      const json = await res.json();
      if (json.success) {
        setSchedulerStatus(json.data as SchedulerStatus);
      }
    } catch {
      /* silent */
    }
  }, []);

  // ── Tạm dừng / tiếp tục scheduler ──
  const handleTogglePause = useCallback(async () => {
    if (!schedulerStatus) return;
    const action = schedulerStatus.paused ? "resume" : "pause";
    try {
      const res = await fetch("/api/scheduler", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        setSchedulerStatus(json.data as SchedulerStatus);
      }
    } catch {
      /* silent */
    }
  }, [schedulerStatus]);

  // ── Xóa bài ──
  const handleDeletePost = useCallback(
    async (postId: string, threadsPostId?: string) => {
      try {
        const url = threadsPostId
          ? `/api/post/${postId}?threadsId=${encodeURIComponent(threadsPostId)}`
          : `/api/post/${postId}`;
        await fetch(url, { method: "DELETE" });
        await fetchHistory();
      } catch {
        /* silent */
      }
    },
    [fetchHistory],
  );

  // ── Tạo nội dung AI ──
  const handleGenerate = async (overrideCustomPrompt?: string) => {
    setError("");

    // ── Puter.js path: client-side, không cần API key ──
    if (aiProvider.id === "puter") {
      const keywordsArr = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
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
          aiProvider.model,
          {
            // Cập nhật content thờ real-time trong khi stream
            onChunk: (accumulated) => setContent(accumulated),
          },
        );
        if (result) {
          setContent(result.fullPost);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Puter.js lỗi không xác định",
        );
      }
      return; // Dừng ở đây — KHÔNG chạy backend path phía dưới
    }

    // ── Backend path: Gemini / OpenAI có API key — giữ nguyên ──
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setContent(json.data.fullPost);
      } else setError(json.error || "Lỗi tạo nội dung");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setGenerating(false);
    }
  };

  // ── Đăng bài (ngay hoặc hẹn giờ) ──
  const handlePost = async () => {
    if (mediaType === "TEXT" && !content.trim()) {
      setError("Vui lòng tạo hoặc nhập nội dung");
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
        content: content.trim() || undefined,
        mediaType,
        imageUrl: mediaType === "IMAGE" ? imageUrl.trim() : undefined,
        scheduledAt: isScheduled
          ? new Date(scheduledTime).toISOString()
          : undefined,
        accountId,
      };

      const res = await fetch("/api/platforms/threads/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        if (isScheduled) {
          setSuccess(
            `Đã hẹn lịch! Bài sẽ đăng lúc ${new Date(scheduledTime).toLocaleString("vi-VN")}`,
          );
        } else {
          setSuccess(
            `Đăng thành công! ID: ${json.data.threadsPostId ?? json.data.id}`,
          );
        }
        setContent("");
        setImageUrl("");
        setIsScheduled(false);
        setScheduledTime(defaultScheduledTime());
        fetchHistory();
        fetchManualPosts();
      } else {
        setError(json.error || "Đăng bài thất bại");
      }
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return {
    // stats & history
    stats,
    posts,
    fetchHistory,
    // Threads API posts
    threadsPosts,
    threadsTotal,
    threadsLoading,
    threadsError,
    fetchThreadsPosts,
    // compose state
    content,
    setContent,
    keywords,
    setKeywords,
    customPrompt,
    setCustomPrompt,
    // AI provider
    aiProvider,
    aiProviders,
    handleProviderChange,
    handleModelChange,
    // Scheduler
    schedulerStatus,
    handleTogglePause,
    handleRunMissedSlot,
    handleSkipSlot,
    // Live refresh
    lastRefreshed,
    countdown,
    // actions
    handleGenerate,
    handlePost,
    handleDeletePost,
    // loading flags
    loading,
    generating: aiProvider.id === "puter" ? puterGenerating : generating,
    // messages
    error,
    success,
    // compose extra state
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    isScheduled,
    setIsScheduled,
    scheduledTime,
    setScheduledTime,
    // manual scheduled posts
    manualPosts,
    manualPostsStats,
    manualPostsLoading,
    manualPostsError,
    fetchManualPosts,
    ensureManualFetched,
    handleCancelManualPost,
    // Account (multi-account)
    accountId,
    setAccountId,
  };
}
