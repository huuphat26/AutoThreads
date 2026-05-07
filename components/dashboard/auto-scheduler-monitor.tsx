"use client";

import {
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useState,
} from "react";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord, ContentPoolItem } from "@/types";
import type { SchedulerStatus } from "./auto-scheduler/types";
import { isTodayVN, slotDateToday, fmtTime } from "./auto-scheduler/constants";
import { TodaySlotCard } from "./auto-scheduler/slot-card";
import { Pill } from "./auto-scheduler/status-badge";

const SLOT_ORDER = ["evening"] as const;
type SlotId = (typeof SLOT_ORDER)[number];
type PlatformFilter = "all" | "facebook" | "threads" | "instagram";
type StatusFilter = "all" | "attention" | "active" | "done";
type AttentionSort = "severity" | "latest";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "attention", label: "Cần xử lý" },
  { key: "active", label: "Đang chạy/chờ" },
  { key: "done", label: "Đã xong" },
];

const PLATFORM_FILTERS: Array<{ key: PlatformFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "facebook", label: "Facebook" },
  { key: "threads", label: "Threads" },
  { key: "instagram", label: "Instagram" },
];

const ATTENTION_SORT_OPTIONS: Array<{ key: AttentionSort; label: string }> = [
  { key: "severity", label: "Mức độ" },
  { key: "latest", label: "Mới nhất" },
];

const SLOT_LABEL: Record<(typeof SLOT_ORDER)[number], string> = {
  evening: "Buổi tối",
};

function parseStatusFilter(value: string | null): StatusFilter | null {
  if (!value) return null;
  return STATUS_FILTERS.some((item) => item.key === value)
    ? (value as StatusFilter)
    : null;
}

function parsePlatformFilter(value: string | null): PlatformFilter | null {
  if (!value) return null;
  return PLATFORM_FILTERS.some((item) => item.key === value)
    ? (value as PlatformFilter)
    : null;
}

function parseAttentionSort(value: string | null): AttentionSort | null {
  if (!value) return null;
  return ATTENTION_SORT_OPTIONS.some((item) => item.key === value)
    ? (value as AttentionSort)
    : null;
}

function matchStatusFilter(
  record: AutoPostRecord | null,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  if (!record) return false;

  if (filter === "attention") {
    return (
      record.overallStatus === "failed" ||
      record.overallStatus === "partial" ||
      record.overallStatus === "no_image"
    );
  }

  if (filter === "active") {
    return (
      record.overallStatus === "running" ||
      record.overallStatus === "waiting_for_ai" ||
      record.overallStatus === "content_ready"
    );
  }

  return (
    record.overallStatus === "completed" || record.overallStatus === "dismissed"
  );
}

function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

type State = {
  status: SchedulerStatus | null;
  records: AutoPostRecord[];
  loading: boolean;
  error: string;
  dismissedSlots: Set<string>;
  previewItem: ContentPoolItem | null;
};

type Action =
  | { type: "SET_DATA"; status: SchedulerStatus; records: AutoPostRecord[] }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "DISMISS_SLOT"; slotId: string }
  | { type: "SET_PREVIEW"; item: ContentPoolItem | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, status: action.status, records: action.records };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "DISMISS_SLOT": {
      const next = new Set(state.dismissedSlots);
      next.add(action.slotId);
      return { ...state, dismissedSlots: next };
    }
    case "SET_PREVIEW":
      return { ...state, previewItem: action.item };
    default:
      return state;
  }
}

// Cache toàn cục
let CACHED_SCHEDULER_STATUS: SchedulerStatus | null = null;
let CACHED_SCHEDULER_RECORDS: AutoPostRecord[] = [];

export function AutoSchedulerMonitor() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [queryReady, setQueryReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [attentionSort, setAttentionSort] = useState<AttentionSort>("severity");
  const [focusAttention, setFocusAttention] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);

  const [state, dispatch] = useReducer(reducer, {
    status: CACHED_SCHEDULER_STATUS,
    records: CACHED_SCHEDULER_RECORDS,
    loading: !CACHED_SCHEDULER_STATUS,
    error: "",
    dismissedSlots: new Set<string>(),
    previewItem: null,
  });

  const { status, records, loading, error, dismissedSlots, previewItem } =
    state;

  const processingRef = useRef<Set<string>>(new Set());
  const initialFetched = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attentionPanelRef = useRef<HTMLElement | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    const shouldShowLoading = showLoading && !CACHED_SCHEDULER_STATUS;
    if (shouldShowLoading) dispatch({ type: "SET_LOADING", loading: true });
    dispatch({ type: "SET_ERROR", error: "" });
    try {
      const [s, h, p] = await Promise.all([
        fetch("/api/auto-scheduler").then((r) => r.json()),
        fetch("/api/auto-scheduler?view=history&today=true").then((r) =>
          r.json(),
        ),
        fetch("/api/auto-scheduler?view=preview-pool").then((r) => r.json()),
      ]);
      if (s.success && h.success) {
        dispatch({
          type: "SET_DATA",
          status: s.data,
          records: h.data as AutoPostRecord[],
        });
        if (p.success) {
          dispatch({ type: "SET_PREVIEW", item: p.data });
        }
        CACHED_SCHEDULER_STATUS = s.data;
        CACHED_SCHEDULER_RECORDS = h.data as AutoPostRecord[];
        setLastFetchedAt(Date.now());
      }
    } catch {
      dispatch({ type: "SET_ERROR", error: "Không thể tải dữ liệu" });
    } finally {
      if (shouldShowLoading) dispatch({ type: "SET_LOADING", loading: false });
    }
  }, []);

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
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const statusFromQuery = parseStatusFilter(params.get("status"));
    const platformFromQuery = parsePlatformFilter(params.get("platform"));
    const sortFromQuery = parseAttentionSort(params.get("sort"));
    const focusFromQuery = params.get("focus") === "1";

    if (statusFromQuery) setStatusFilter(statusFromQuery);
    if (platformFromQuery) setPlatformFilter(platformFromQuery);
    if (sortFromQuery) setAttentionSort(sortFromQuery);
    if (focusFromQuery) setFocusAttention(true);

    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const params = url.searchParams;

    if (statusFilter === "all") params.delete("status");
    else params.set("status", statusFilter);

    if (platformFilter === "all") params.delete("platform");
    else params.set("platform", platformFilter);

    if (attentionSort === "severity") params.delete("sort");
    else params.set("sort", attentionSort);

    if (!focusAttention) params.delete("focus");
    else params.set("focus", "1");

    const query = params.toString();
    const nextUrl = `${url.pathname}${query ? `?${query}` : ""}`;
    const currentUrl = `${url.pathname}${url.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [queryReady, statusFilter, platformFilter, attentionSort, focusAttention]);

  const dashboardMetrics = useMemo(() => {
    const postedPlatforms = records.reduce((sum, record) => {
      const posted = [record.facebook, record.threads, record.instagram].filter(
        (p) => p.status === "posted",
      ).length;
      return sum + posted;
    }, 0);

    const failedPlatforms = records.reduce((sum, record) => {
      const failed = [record.facebook, record.threads, record.instagram].filter(
        (p) => p.status === "failed",
      ).length;
      return sum + failed;
    }, 0);

    const activeSlots = records.filter(
      (record) =>
        record.overallStatus === "running" ||
        record.overallStatus === "waiting_for_ai" ||
        record.overallStatus === "content_ready",
    ).length;

    const attentionSlots = records.filter(
      (record) =>
        record.overallStatus === "failed" || record.overallStatus === "partial",
    ).length;

    const totalSlots = status?.slots?.length ?? SLOT_ORDER.length;
    const plannedPlatforms = Math.max(totalSlots * 3, records.length * 3);
    const completionRate =
      plannedPlatforms > 0
        ? Math.round((postedPlatforms / plannedPlatforms) * 100)
        : 0;

    let nextSlotId: (typeof SLOT_ORDER)[number] = "evening";
    let nextSlotAt: Date = slotDateToday("evening");
    let foundUpcoming = false;

    for (const slotId of SLOT_ORDER) {
      const at = slotDateToday(slotId);
      if (at.getTime() > nowMs) {
        nextSlotId = slotId;
        nextSlotAt = at;
        foundUpcoming = true;
        break;
      }
    }

    if (!foundUpcoming) {
      nextSlotAt = slotDateToday("evening");
      nextSlotAt.setDate(nextSlotAt.getDate() + 1);
      nextSlotId = "evening";
    }

    const nextIn = formatDuration(nextSlotAt.getTime() - nowMs);
    const nextSlotAtLabel = nextSlotAt.toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
    });

    const refreshInSec =
      lastFetchedAt === null
        ? 30
        : Math.max(
            0,
            30 - Math.min(30, Math.floor((nowMs - lastFetchedAt) / 1000)),
          );

    return {
      postedPlatforms,
      failedPlatforms,
      activeSlots,
      attentionSlots,
      plannedPlatforms,
      completionRate,
      nextSlotId,
      nextSlotAtLabel,
      nextIn,
      refreshInSec,
    };
  }, [records, status?.slots?.length, nowMs, lastFetchedAt]);

  const todayRecords = useMemo(
    () => records.filter((r) => isTodayVN(r.triggeredAt)),
    [records],
  );

  const slotRecords = useMemo(() => {
    const bySlot: Record<SlotId, AutoPostRecord | null> = {
      evening: null,
    };

    for (const slotId of SLOT_ORDER) {
      bySlot[slotId] =
        todayRecords.find(
          (r) => r.slot === slotId && isTodayVN(r.triggeredAt),
        ) ?? null;
    }

    return bySlot;
  }, [todayRecords]);

  const visibleSlots = useMemo(
    () =>
      SLOT_ORDER.filter((slotId) =>
        matchStatusFilter(slotRecords[slotId], statusFilter),
      ),
    [slotRecords, statusFilter],
  );

  const attentionRecords = useMemo(
    () =>
      todayRecords.filter(
        (r) =>
          r.overallStatus === "failed" ||
          r.overallStatus === "partial" ||
          r.overallStatus === "no_image",
      ),
    [todayRecords],
  );

  const sortedAttentionRecords = useMemo(() => {
    const getSeverity = (record: AutoPostRecord): number => {
      if (record.overallStatus === "failed") return 3;
      if (record.overallStatus === "partial") return 2;
      if (record.overallStatus === "no_image") return 1;
      return 0;
    };

    const recordsToSort = [...attentionRecords];
    recordsToSort.sort((a, b) => {
      if (attentionSort === "latest") {
        return (
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
        );
      }

      const severityDelta = getSeverity(b) - getSeverity(a);
      if (severityDelta !== 0) return severityDelta;
      return (
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      );
    });

    return recordsToSort;
  }, [attentionRecords, attentionSort]);

  const retryableSlots = useMemo(
    () =>
      Array.from(
        new Set(
          attentionRecords
            .filter(
              (r) =>
                r.overallStatus === "failed" || r.overallStatus === "partial",
            )
            .map((r) => r.slot as SlotId),
        ),
      ),
    [attentionRecords],
  );

  useEffect(() => {
    if (!focusAttention) return;

    setStatusFilter("attention");
    setPlatformFilter("all");
    attentionPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [focusAttention]);

  // REMOVED: Auto-trigger AI generation (User request: Monitor only, no UI action)
  /*
  useEffect(() => {
    const waiting = todayRecords.find(
      (r) =>
        r.overallStatus === "waiting_for_ai" &&
        !processingRef.current.has(r.id),
    );
    if (waiting) generateAndSubmit(waiting);
  }, [todayRecords, generateAndSubmit]);
  */

  const triggerRetrySlot = useCallback(async (slotId: SlotId) => {
    await fetch("/api/auto-scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry-slot", slot: slotId }),
    });
  }, []);

  const handleRetrySlot = useCallback(
    async (slotId: SlotId) => {
      try {
        await triggerRetrySlot(slotId);
        // Refresh data sau 2s để thấy record mới
        setTimeout(() => fetchData(false), 2000);
      } catch (err) {
        console.error("[AutoSchedulerMonitor] Retry slot lỗi:", err);
      }
    },
    [fetchData, triggerRetrySlot],
  );

  const handleRetryAllAttention = useCallback(async () => {
    if (retryableSlots.length === 0 || retryingAll) return;
    setRetryingAll(true);
    try {
      await Promise.all(
        retryableSlots.map((slotId) => triggerRetrySlot(slotId)),
      );
      setTimeout(() => fetchData(false), 2000);
    } catch (err) {
      console.error("[AutoSchedulerMonitor] Retry all attention lỗi:", err);
    } finally {
      setRetryingAll(false);
    }
  }, [fetchData, retryableSlots, retryingAll, triggerRetrySlot]);

  const handleDismissSlot = useCallback(
    async (slotId: SlotId, recordId?: string) => {
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
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-linear-to-r from-violet-50 via-purple-50 to-fuchsia-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
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
                Tự động tạo & đăng bài lúc 20:00
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[
              {
                label: "Facebook",
                color: "bg-blue-500",
              },
              {
                label: "Threads",
                color: "bg-slate-800",
              },
              {
                label: "Instagram",
                color: "bg-gradient-to-r from-purple-500 to-pink-500",
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

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">
              Đã đăng hôm nay
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {dashboardMetrics.postedPlatforms}
              <span className="ml-1 text-xs font-medium text-emerald-500">
                / {dashboardMetrics.plannedPlatforms}
              </span>
            </p>
            <p className="text-[10px] text-emerald-600">
              Hoàn tất {dashboardMetrics.completionRate}%
            </p>
          </div>

          <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-rose-600 font-semibold">
              Cần xử lý
            </p>
            <p className="mt-1 text-lg font-bold text-rose-700">
              {dashboardMetrics.attentionSlots}
            </p>
            <p className="text-[10px] text-rose-600">
              {dashboardMetrics.failedPlatforms} lỗi nền tảng
            </p>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold">
              Slot tiếp theo
            </p>
            <p className="mt-1 text-sm font-bold text-blue-700">
              {SLOT_LABEL[dashboardMetrics.nextSlotId]} ·{" "}
              {dashboardMetrics.nextSlotAtLabel}
            </p>
            <p className="text-[10px] text-blue-600">
              Còn {dashboardMetrics.nextIn}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">
              Đồng bộ
            </p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              {dashboardMetrics.activeSlots} slot đang chạy/chờ
            </p>
            <p className="text-[10px] text-slate-500">
              Làm mới sau {dashboardMetrics.refreshInSec}s
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Trạng thái
                </p>
                <div className="flex items-center gap-1">
                  {STATUS_FILTERS.map((item) => {
                    const active = statusFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setStatusFilter(item.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                          active
                            ? "bg-slate-800 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden sm:block w-px h-8 bg-slate-200 mx-2" />

              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                  Nền tảng
                </p>
                <div className="flex items-center gap-1">
                  {PLATFORM_FILTERS.map((item) => {
                    const active = platformFilter === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setPlatformFilter(item.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                          active
                            ? "bg-violet-600 text-white shadow-sm"
                            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ml-auto hidden md:flex items-center gap-3 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đã xong
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Đang chạy
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  Đang chờ
                </div>
              </div>
            </div>

            {loading && records.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-slate-300" />
              </div>
            ) : visibleSlots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  Không có khung giờ phù hợp bộ lọc hiện tại.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {visibleSlots.map((slotId) => (
                  <TodaySlotCard
                    key={slotId}
                    slotId={slotId}
                    record={slotRecords[slotId]}
                    previewItem={previewItem}
                    onRetry={handleRetrySlot}
                    onDismiss={handleDismissSlot}
                    dismissed={dismissedSlots.has(slotId)}
                    platformFilter={platformFilter}
                    onPostNow={handleRetrySlot}
                  />
                ))}
              </div>
            )}
          </div>

          <aside
            ref={attentionPanelRef}
            className="xl:sticky xl:top-24 h-fit rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
          >
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Cần xử lý
              </h3>
              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600 text-[10px] font-bold">
                {attentionRecords.length}
              </span>
            </div>

            <div className="p-3 space-y-3">
              {attentionRecords.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRetryAllAttention}
                    disabled={retryingAll || retryableSlots.length === 0}
                    className={`flex-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      retryingAll || retryableSlots.length === 0
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-rose-500 text-white hover:bg-rose-600"
                    }`}
                  >
                    {retryingAll
                      ? "..."
                      : `Retry hết (${retryableSlots.length})`}
                  </button>
                  <button
                    onClick={() => setFocusAttention((prev) => !prev)}
                    className={`flex-1 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                      focusAttention
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {focusAttention ? "Bỏ Focus" : "Focus lỗi"}
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-90 overflow-y-auto pr-1">
                {attentionRecords.length === 0 ? (
                  <div className="py-4 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 mb-2">
                      <svg
                        className="w-4 h-4 text-emerald-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Hệ thống ổn định
                    </p>
                  </div>
                ) : (
                  sortedAttentionRecords.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-700">
                            {fmtTime(record.triggeredAt)}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {record.topicLabel || "Chưa có chủ đề"}
                          </p>
                        </div>
                        <Pill status={record.overallStatus} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(record.overallStatus === "failed" ||
                          record.overallStatus === "partial") && (
                          <button
                            onClick={() =>
                              handleRetrySlot(record.slot as SlotId)
                            }
                            className="flex-1 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 px-2 py-1 rounded-md"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDismissSlot(record.slot as SlotId, record.id)
                          }
                          className="flex-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md border border-slate-200 bg-white shadow-sm"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
