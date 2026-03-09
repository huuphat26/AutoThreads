"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord } from "@/types";
import type { SchedulerStatus } from "./auto-scheduler/types";
import { isTodayVN, todayLabel } from "./auto-scheduler/constants";
import { TodaySlotCard } from "./auto-scheduler/slot-card";



type PuterWindow = Window & {
  puter?: {
    ai: { chat: (...args: unknown[]) => Promise<AsyncIterable<{ text: string }>> };
    auth?: {
      getUser?: () => Promise<{ username?: string }>;
      signOut?: () => Promise<void>;
    };
  };
};




export function AutoSchedulerMonitor() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [records, setRecords] = useState<AutoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const [dismissedSlots, setDismissedSlots] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const initialFetched = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [s, h] = await Promise.all([
        fetch("/api/auto-scheduler").then((r) => r.json()),
        fetch("/api/auto-scheduler?view=history&today=true").then((r) => r.json()),
      ]);
      if (s.success) setStatus(s.data);
      if (h.success) setRecords(h.data as AutoPostRecord[]);
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const generateAndSubmit = useCallback(
    async (record: AutoPostRecord) => {
      if (processingRef.current.has(record.id)) return;
      processingRef.current.add(record.id);
      setAiGeneratingId(record.id);

      try {
        const cfgRes = await fetch("/api/ai-config").then((r) => r.json());
        const model: string = cfgRes.data?.currentProvider?.model ?? "gpt-4o-mini";

        const puterRef = (window as PuterWindow).puter;
        if (!puterRef) throw new Error("Puter.js chưa tải. Vui lòng tải lại trang.");

        const generateContent = async (systemPrompt: string, userPrompt: string): Promise<string> => {
          const stream = (await puterRef.ai.chat(
            [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
            { model, stream: true },
          )) as AsyncIterable<{ text: string }>;
          let accumulated = "";
          for await (const chunk of stream) {
            if (chunk.text) accumulated += chunk.text;
          }
          try {
            const parsed = JSON.parse(accumulated);
            return (parsed.content ?? parsed.fullPost ?? accumulated).trim();
          } catch {
            return accumulated.trim();
          }
        };

        // Step 1: Facebook
        const fbPromptJson = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "facebook" }),
        }).then((r) => r.json());
        if (!fbPromptJson.success) throw new Error(fbPromptJson.error ?? "Không thể build FB prompt");
        const { systemPrompt: fbSys, userPrompt: fbUser, topicLabel, topicId } =
          fbPromptJson.data as { systemPrompt: string; userPrompt: string; topicLabel: string; topicId: string };
        const fbContent = await generateContent(fbSys, fbUser);
        if (!fbContent) throw new Error("AI không trả về nội dung Facebook");

        // Step 2: Threads
        const thPromptJson = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "threads", topic: topicId }),
        }).then((r) => r.json());
        if (!thPromptJson.success) throw new Error(thPromptJson.error ?? "Không thể build Threads prompt");
        const { systemPrompt: thSys, userPrompt: thUser } =
          thPromptJson.data as { systemPrompt: string; userPrompt: string };
        let threadsContent = await generateContent(thSys, thUser);
        if (!threadsContent) threadsContent = fbContent;
        threadsContent = threadsContent.slice(0, 480);

        // Step 3: Instagram
        const igPromptJson = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "instagram", fbContent }),
        }).then((r) => r.json());
        if (!igPromptJson.success) throw new Error(igPromptJson.error ?? "Không thể build IG prompt");
        const { systemPrompt: igSys, userPrompt: igUser } =
          igPromptJson.data as { systemPrompt: string; userPrompt: string };
        let igCaption = await generateContent(igSys, igUser);
        if (!igCaption) igCaption = fbContent.slice(0, 250);

        // Submit
        const submitJson = await fetch("/api/auto-scheduler", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: record.id, fbContent, threadsContent, igCaption, topicLabel }),
        }).then((r) => r.json());
        if (!submitJson.success) throw new Error(submitJson.error ?? "Submit thất bại");

        await fetchData();
      } catch (err) {
        console.error("[AutoSchedulerMonitor] AI generate lỗi:", err);
        processingRef.current.delete(record.id);
      } finally {
        setAiGeneratingId(null);
      }
    },
    [fetchData],
  );

  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;
    fetchData(true);
    intervalRef.current = setInterval(() => fetchData(false), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const waiting = records.find(
      (r) => r.overallStatus === "waiting_for_ai" && isTodayVN(r.triggeredAt) && !processingRef.current.has(r.id),
    );
    if (waiting) generateAndSubmit(waiting);
  }, [records, generateAndSubmit]);

  function todayRecord(slotId: string): AutoPostRecord | null {
    return records.find((r) => r.slot === slotId && isTodayVN(r.triggeredAt)) ?? null;
  }

  const handleRetrySlot = useCallback(async (slotId: string) => {
    try {
      await fetch("/api/auto-scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-slot", slot: slotId }),
      });
      // Refresh data sau 2s để thấy record mới
      setTimeout(() => fetchData(false), 2000);
    } catch (err) {
      console.error("[AutoSchedulerMonitor] Retry slot lỗi:", err);
    }
  }, [fetchData]);

  const handleDismissSlot = useCallback(async (slotId: string, recordId?: string) => {
    // Ẩn banner ngay lập tức ở client
    setDismissedSlots((prev) => new Set(prev).add(slotId));
    try {
      if (recordId) {
        await fetch("/api/auto-scheduler", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dismiss-slot", slot: slotId, recordId }),
        });
        await fetchData(false);
      }
    } catch (err) {
      console.error("[AutoSchedulerMonitor] Dismiss slot lỗi:", err);
    }
  }, [fetchData]);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 sm:px-5 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Đăng tự động 3 nền tảng
            </h2>
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {[
                { label: "Facebook", color: "text-blue-500 bg-blue-50 border-blue-100" },
                { label: "Threads", color: "text-slate-600 bg-slate-50 border-slate-200" },
                { label: "Instagram", color: "text-pink-500 bg-pink-50 border-pink-100" },
              ].map((p) => (
                <span key={p.label} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${p.color}`}>
                  {p.label}
                </span>
              ))}
              {status?.slots && (
                <span className="text-[10px] text-slate-400">· {status.slots.length} khung giờ/ngày</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-5 py-4 space-y-4">
        {error && <p className="text-xs text-rose-500">{error}</p>}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Lịch hôm nay — {todayLabel()}
          </p>
          {aiGeneratingId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
              <Spinner className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-violet-600">Đang soạn nội dung bằng Puter.js AI…</span>
            </div>
          )}
          {loading && records.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner className="w-5 h-5 text-slate-300" />
            </div>
          ) : (
            <div className="space-y-2">
              <TodaySlotCard slotId="morning" record={todayRecord("morning")} onRetry={handleRetrySlot} onDismiss={handleDismissSlot} dismissed={dismissedSlots.has("morning")} />
              <TodaySlotCard slotId="lunch" record={todayRecord("lunch")} onRetry={handleRetrySlot} onDismiss={handleDismissSlot} dismissed={dismissedSlots.has("lunch")} />
              <TodaySlotCard slotId="evening" record={todayRecord("evening")} onRetry={handleRetrySlot} onDismiss={handleDismissSlot} dismissed={dismissedSlots.has("evening")} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-slate-50 text-[9px] text-slate-300">
          {[
            { color: "bg-emerald-500", label: "Đã đăng" },
            { color: "bg-rose-500", label: "Thất bại" },
            { color: "bg-amber-400", label: "Đang xử lý" },
            { color: "bg-slate-300", label: "Đã lên lịch" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
