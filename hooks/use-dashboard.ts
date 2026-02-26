// ============================================
// Hook: useDashboard — toàn bộ state & logic
// ============================================
"use client";

import { useState, useEffect, useCallback } from "react";
import type { PostSlot, ContentTopic, ScheduledPost } from "@/types";

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
  const [slot, setSlot] = useState<PostSlot>("morning");
  const [topic, setTopic] = useState<ContentTopic>("detox");
  const [content, setContent] = useState("");
  const [keywords, setKeywords] = useState("");
  const [topicLabel, setTopicLabel] = useState<string | undefined>(undefined);

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
    fetchHistory();
    const id = setInterval(fetchHistory, 15_000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  // ── Tạo nội dung AI ──
  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot,
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
        body: JSON.stringify({ content, slot, topic, topicLabel }),
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
    slot,
    setSlot,
    topic,
    setTopic,
    content,
    setContent,
    keywords,
    setKeywords,
    // actions
    handleGenerate,
    handlePost,
    // loading flags
    loading,
    generating,
    // messages
    error,
    success,
  };
}
