// ============================================
// Hook: useDashboard — toàn bộ state & logic
// ============================================
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ContentTopic,
  ScheduledPost,
  ProviderInfo,
  SchedulerStatus,
} from "@/types";
import { TOPICS } from "@/lib/topics";

export type DashboardStats = {
  total: number;
  posted: number;
  failed: number;
  pending: number;
  draft: number;
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
  const [topic, setTopic] = useState<ContentTopic>(TOPICS[0]?.id ?? "detox");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [topicLabel, setTopicLabel] = useState<string | undefined>(undefined);

  // AI Provider state
  const [aiProvider, setAIProvider] = useState<ProviderInfo>({
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.0-flash",
    models: ["gemini-2.0-flash"],
    available: true,
  });
  const [aiProviders, setAIProviders] = useState<ProviderInfo[]>([]);

  // Scheduler state
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerStatus | null>(null);

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
  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setContent(json.data.fullPost);
        setTopicLabel(json.data.topicLabel || undefined);
      } else setError(json.error || "Lỗi tạo nội dung");
    } catch {
      setError("Không thể kết nối server");
    } finally {
      setGenerating(false);
    }
  };

  // ── Đăng bài ──
  const handlePost = async () => {
    if (!content.trim()) {
      setError("Vui lòng tạo hoặc nhập nội dung");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, topic, topicLabel }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Đăng thành công! ID: ${json.data.threadsPostId}`);
        setContent("");
        fetchHistory();
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
    // compose state
    topic,
    setTopic,
    content,
    setContent,
    keywords,
    setKeywords,
    // AI provider
    aiProvider,
    aiProviders,
    handleProviderChange,
    handleModelChange,
    // Scheduler
    schedulerStatus,
    handleTogglePause,
    // Live refresh
    lastRefreshed,
    countdown,
    // actions
    handleGenerate,
    handlePost,
    handleDeletePost,
    // loading flags
    loading,
    generating,
    // messages
    error,
    success,
  };
}
