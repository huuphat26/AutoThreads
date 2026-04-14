"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord } from "@/types";
import type { SchedulerStatus } from "./auto-scheduler/types";
import { isTodayVN, todayLabel } from "./auto-scheduler/constants";
import { TodaySlotCard } from "./auto-scheduler/slot-card";

type PuterWindow = Window & {
  puter?: {
    ai: {
      chat: (...args: unknown[]) => Promise<AsyncIterable<{ text: string }>>;
    };
    auth?: {
      getUser?: () => Promise<{ username?: string }>;
      signOut?: () => Promise<void>;
    };
  };
};

type State = {
  status: SchedulerStatus | null;
  records: AutoPostRecord[];
  loading: boolean;
  error: string;
  aiGeneratingId: string | null;
  dismissedSlots: Set<string>;
};

type Action =
  | { type: "SET_DATA"; status: SchedulerStatus; records: AutoPostRecord[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_AI_GENERATING"; id: string | null }
  | { type: "DISMISS_SLOT"; slotId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, status: action.status, records: action.records };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_AI_GENERATING":
      return { ...state, aiGeneratingId: action.id };
    case "DISMISS_SLOT": {
      const next = new Set(state.dismissedSlots);
      next.add(action.slotId);
      return { ...state, dismissedSlots: next };
    }
    default:
      return state;
  }
}

export function AutoSchedulerMonitor() {
  const [state, dispatch] = useReducer(reducer, {
    status: null,
    records: [],
    loading: true,
    error: "",
    aiGeneratingId: null,
    dismissedSlots: new Set<string>(),
  });

  const { status, records, loading, error, aiGeneratingId, dismissedSlots } =
    state;

  const processingRef = useRef<Set<string>>(new Set());
  const initialFetched = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) dispatch({ type: "SET_LOADING", loading: true });
    dispatch({ type: "SET_ERROR", error: "" });
    try {
      const [s, h] = await Promise.all([
        fetch("/api/auto-scheduler").then((r) => r.json()),
        fetch("/api/auto-scheduler?view=history&today=true").then((r) =>
          r.json(),
        ),
      ]);
      if (s.success && h.success) {
        dispatch({
          type: "SET_DATA",
          status: s.data,
          records: h.data as AutoPostRecord[],
        });
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Không thể tải dữ liệu" });
    } finally {
      if (showLoading) dispatch({ type: "SET_LOADING", loading: false });
    }
  }, []);

  const generateAndSubmit = useCallback(
    async (record: AutoPostRecord) => {
      if (processingRef.current.has(record.id)) return;
      processingRef.current.add(record.id);
      dispatch({ type: "SET_AI_GENERATING", id: record.id });

      try {
        const cfgRes = await fetch("/api/ai-config").then((r) => r.json());
        const model: string =
          cfgRes.data?.currentProvider?.model ?? "gpt-4o-mini";

        const puterRef = (window as PuterWindow).puter;
        if (!puterRef)
          throw new Error("Puter.js chưa tải. Vui lòng tải lại trang.");

        const generateContent = async (
          systemPrompt: string,
          userPrompt: string,
        ): Promise<string> => {
          const stream = (await puterRef.ai.chat(
            [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
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
        if (!fbPromptJson.success)
          throw new Error(fbPromptJson.error ?? "Không thể build FB prompt");
        const {
          systemPrompt: fbSys,
          userPrompt: fbUser,
          topicLabel,
          topicId,
        } = fbPromptJson.data as {
          systemPrompt: string;
          userPrompt: string;
          topicLabel: string;
          topicId: string;
        };
        const fbContent = await generateContent(fbSys, fbUser);
        if (!fbContent) throw new Error("AI không trả về nội dung Facebook");

        // Step 2: Threads
        const thPromptJson = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "threads", topic: topicId }),
        }).then((r) => r.json());
        if (!thPromptJson.success)
          throw new Error(
            thPromptJson.error ?? "Không thể build Threads prompt",
          );
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
        if (!igPromptJson.success)
          throw new Error(igPromptJson.error ?? "Không thể build IG prompt");
        const { systemPrompt: igSys, userPrompt: igUser } =
          igPromptJson.data as { systemPrompt: string; userPrompt: string };
        let igCaption = await generateContent(igSys, igUser);
        if (!igCaption) igCaption = fbContent.slice(0, 250);

        // Submit
        const submitJson = await fetch("/api/auto-scheduler", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: record.id,
            fbContent,
            threadsContent,
            igCaption,
            topicLabel,
          }),
        }).then((r) => r.json());
        if (!submitJson.success)
          throw new Error(submitJson.error ?? "Submit thất bại");

        await fetchData();
      } catch (err) {
        console.error("[AutoSchedulerMonitor] AI generate lỗi:", err);
        processingRef.current.delete(record.id);
      } finally {
        dispatch({ type: "SET_AI_GENERATING", id: null });
      }
    },
    [fetchData],
  );

  useEffect(() => {
    if (initialFetched.current) return;
    initialFetched.current = true;
    fetchData(true);
    intervalRef.current = setInterval(() => fetchData(false), 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const waiting = records.find(
      (r) =>
        r.overallStatus === "waiting_for_ai" &&
        isTodayVN(r.triggeredAt) &&
        !processingRef.current.has(r.id),
    );
    if (waiting) generateAndSubmit(waiting);
  }, [records, generateAndSubmit]);

  function todayRecord(slotId: string): AutoPostRecord | null {
    return (
      records.find((r) => r.slot === slotId && isTodayVN(r.triggeredAt)) ?? null
    );
  }

  const handleRetrySlot = useCallback(
    async (slotId: string) => {
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
    },
    [fetchData],
  );

  const handleDismissSlot = useCallback(
    async (slotId: string, recordId?: string) => {
      // Ẩn banner ngay lập tức ở client
      dispatch({ type: "DISMISS_SLOT", slotId });
      try {
        if (recordId) {
          await fetch("/api/auto-scheduler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "dismiss-slot",
              slot: slotId,
              recordId,
            }),
          });
          await fetchData(false);
        }
      } catch (err) {
        console.error("[AutoSchedulerMonitor] Dismiss slot lỗi:", err);
      }
    },
    [fetchData],
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Đăng tự động 3 nền tảng
              </h2>
              <p className="text-xs text-slate-500">
                Tự động tạo & đăng bài mỗi ngày
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                label: "Facebook",
                color: "bg-blue-500",
                textColor: "text-blue-600",
              },
              {
                label: "Threads",
                color: "bg-slate-800",
                textColor: "text-slate-700",
              },
              {
                label: "Instagram",
                color: "bg-gradient-to-r from-purple-500 to-pink-500",
                textColor: "text-pink-600",
              },
            ].map((p) => (
              <span
                key={p.label}
                className={`text-[10px] font-medium px-2 py-1 rounded-full text-white ${p.color}`}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">
        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lịch hôm nay — {todayLabel()}
            </p>
            {status?.slots && (
              <span className="text-[10px] text-slate-400">
                {status.slots.length} khung giờ
              </span>
            )}
          </div>

          {aiGeneratingId && (
            <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
              <Spinner className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-violet-600 font-medium">
                Đang soạn nội dung bằng AI...
              </span>
            </div>
          )}

          {loading && records.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6 text-slate-300" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TodaySlotCard
                slotId="morning"
                record={todayRecord("morning")}
                onRetry={handleRetrySlot}
                onDismiss={handleDismissSlot}
                dismissed={dismissedSlots.has("morning")}
              />
              <TodaySlotCard
                slotId="lunch"
                record={todayRecord("lunch")}
                onRetry={handleRetrySlot}
                onDismiss={handleDismissSlot}
                dismissed={dismissedSlots.has("lunch")}
              />
              <TodaySlotCard
                slotId="evening"
                record={todayRecord("evening")}
                onRetry={handleRetrySlot}
                onDismiss={handleDismissSlot}
                dismissed={dismissedSlots.has("evening")}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
          {[
            { color: "bg-emerald-500", label: "Đã đăng" },
            { color: "bg-rose-500", label: "Thất bại" },
            { color: "bg-amber-400", label: "Đang xử lý" },
            { color: "bg-slate-300", label: "Đã lên lịch" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full inline-block ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
