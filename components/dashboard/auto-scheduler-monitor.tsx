// ============================================================
// AutoSchedulerMonitor — Theo dõi đăng bài tự động 3 nền tảng
// Hiển thị lịch hôm nay (mỗi slot × 3 nền tảng) + lịch sử
// ============================================================
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import type { AutoPostRecord, AutoPostPlatformStatus } from "@/types";

function usePuterUser() {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tryLoad = async () => {
      // Thử nhiều lần vì Puter CDN load async
      for (let i = 0; i < 10; i++) {
        try {
          const puter = (window as Window & { puter?: { auth?: { getUser?: () => Promise<{ username?: string }> } } }).puter;
          if (puter?.auth?.getUser) {
            const u = await puter.auth.getUser();
            if (!cancelled && u?.username) { setUsername(u.username); return; }
          }
        } catch { /* chưa đăng nhập hoặc chưa load */ }
        await new Promise((r) => setTimeout(r, 800));
      }
    };
    tryLoad();
    return () => { cancelled = true; };
  }, []);
  return username;
}

async function puterSignOut() {
  try { await (window as Window & { puter?: { auth?: { signOut?: () => Promise<void> } } }).puter?.auth?.signOut?.(); } finally { window.location.reload(); }
}

// ─── Types ───────────────────────────────────────────────────

type SchedulerStatus = {
  enabled: boolean;
  running: boolean;
  timezone: string;
  slots: { id: string; label: string; prepCron: string; postCron: string }[];
  platformDelayMinutes: number;
  retryWindowMinutes?: number;
  totalRuns: number;
  lastRun: null | {
    id: string;
    triggeredAt: string;
    slot: string;
    overallStatus: string;
    topicLabel?: string;
    facebook: string;
    threads: string;
    instagram: string;
  };
};

const SLOT_HOURS: Record<string, { h: number; m: number }> = {
  morning: { h: 6, m: 30 },
  noon: { h: 11, m: 30 },
  evening: { h: 17, m: 0 },
};
/** Khoảng cách giữa các nền tảng khi đăng (phút) */
const DELAY_MINUTES = 3;
/** Thời gian chuẩn bị content + tạo ảnh AI trước giờ đăng (phút) */
const PREP_BEFORE_POST_MIN = 15;
const PLATFORMS = [
  { key: "facebook", label: "Facebook", delayMin: 0 },
  { key: "threads", label: "Threads", delayMin: DELAY_MINUTES },
  { key: "instagram", label: "Instagram", delayMin: DELAY_MINUTES * 2 },
] as const;

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slotDateToday(slotId: string, extraMinutes = 0): Date {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 0 };
  const now = new Date();
  const vnNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  vnNow.setHours(h, m + extraMinutes, 0, 0);
  const offset =
    now.getTime() -
    new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getTime();
  return new Date(vnNow.getTime() + offset);
}

function slotTimeLabel(slotId: string, extraMinutes: number): string {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 0 };
  const totalMin = m + extraMinutes;
  const hh = String(h + Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isTodayVN(iso: string): boolean {
  const todayKey = new Date().toLocaleDateString("sv", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  return (
    new Date(iso).toLocaleDateString("sv", {
      timeZone: "Asia/Ho_Chi_Minh",
    }) === todayKey
  );
}

// ─── Status config ────────────────────────────────────────────

type StatusKey =
  | AutoPostPlatformStatus
  | "running"
  | "completed"
  | "partial"
  | "scheduled"
  | "waiting"
  | "waiting_for_ai"
  | "content_ready";

const STATUS_CFG: Record<
  StatusKey,
  { dot: string; pill: string; label: string }
> = {
  waiting_for_ai: {
    dot: "bg-violet-400 animate-pulse",
    pill: "bg-violet-50 text-violet-600 border-violet-200",
    label: "Đang soạn AI",
  },
  content_ready: {
    dot: "bg-sky-400",
    pill: "bg-sky-50 text-sky-600 border-sky-200",
    label: "Chờ đăng bài",
  },
  scheduled: {
    dot: "bg-slate-300",
    pill: "bg-slate-50 text-slate-500 border-slate-200",
    label: "Đã lên lịch",
  },
  waiting: {
    dot: "bg-slate-200",
    pill: "bg-slate-50 text-slate-400 border-slate-100",
    label: "Chờ lượt",
  },
  pending: {
    dot: "bg-amber-400 animate-pulse",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Đang xử lý",
  },
  posted: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Đã đăng",
  },
  failed: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-600 border-rose-200",
    label: "Thất bại",
  },
  skipped: {
    dot: "bg-slate-300",
    pill: "bg-slate-100 text-slate-400 border-slate-200",
    label: "Bỏ qua",
  },
  running: {
    dot: "bg-blue-400 animate-pulse",
    pill: "bg-blue-50 text-blue-600 border-blue-200",
    label: "Đang chạy",
  },
  completed: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "Hoàn thành",
  },
  partial: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Một phần",
  },
};

function Dot({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
  );
}

function Pill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${cfg.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

type PlatformResult = AutoPostRecord["facebook"];

function PlatformScheduleRow({
  platformLabel,
  scheduledTime,
  result,
  isPast,
}: {
  platformLabel: string;
  scheduledTime: string;
  result: PlatformResult | null;
  isPast: boolean;
}) {
  const [showError, setShowError] = useState(false);
  const status = result ? result.status : isPast ? "skipped" : "scheduled";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-500 w-20 shrink-0">
          {platformLabel}
        </span>
        <span className="text-xs font-mono font-semibold text-slate-600 shrink-0">
          {scheduledTime}
        </span>
        <span className="flex-1" />
        {result?.postedAt && (
          <span className="text-[10px] text-slate-400 shrink-0">
            ✓ {fmtTime(result.postedAt)}
          </span>
        )}
        <Pill status={status} />
        {result?.status === "failed" && result?.errorMessage && (
          <button
            onClick={() => setShowError((v) => !v)}
            className="text-[10px] text-rose-400 hover:text-rose-600 shrink-0"
          >
            {showError ? "ẩn" : "xem lỗi"}
          </button>
        )}
      </div>
      {showError && result?.errorMessage && (
        <p className="mx-4 mb-2 text-[10px] text-rose-500 bg-rose-50 rounded-lg px-2.5 py-1.5 leading-relaxed">
          {result.errorMessage}
        </p>
      )}
    </div>
  );
}

function TodaySlotCard({
  slotId,
  record,
}: {
  slotId: string;
  record: AutoPostRecord | null;
}) {
  const { h, m } = SLOT_HOURS[slotId] ?? { h: 13, m: 15 };
  const slotName =
    slotId === "morning"
      ? "Buổi sáng"
      : slotId === "noon"
        ? "Buổi trưa"
        : "Buổi tối";
  const baseTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  // Giờ chuẩn bị: 15 phút trước giờ đăng (lấy pool + tạo ảnh AI)
  const prepH = m - PREP_BEFORE_POST_MIN >= 0 ? h : h - 1;
  const prepM = (60 + m - PREP_BEFORE_POST_MIN) % 60;
  const prepTime = `${String(prepH).padStart(2, "0")}:${String(prepM).padStart(2, "0")}`;
  const now = new Date();
  const isRunning = record?.overallStatus === "running";
  const isContentReady = record?.overallStatus === "content_ready";

  const overallStatus =
    record?.overallStatus ??
    (now > slotDateToday(slotId, 4) ? "skipped" : "scheduled");

  const overallPill = isRunning
    ? "running"
    : isContentReady
      ? "content_ready"
      : overallStatus;

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
      {/* Slot header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Dot status={overallPill} />
          <span className="text-xs font-semibold text-slate-700">
            {slotName}
          </span>
          <span className="text-xs font-mono text-slate-400">{baseTime}</span>
        </div>
        <div className="flex items-center gap-2">
          {record?.topicLabel && (
            <span className="text-[10px] text-slate-400 truncate max-w-36 italic">
              {record.topicLabel}
            </span>
          )}
          <Pill status={overallPill} />
        </div>
      </div>
      {/* Prep timeline */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-50/60 border-b border-slate-100 text-[9px] text-slate-400">
        <span className="font-mono font-semibold">{prepTime}</span>
        <span>→ Chuẩn bị</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{baseTime}</span>
        <span>→ FB</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{slotTimeLabel(slotId, DELAY_MINUTES)}</span>
        <span>→ Threads</span>
        <span className="mx-0.5 text-slate-200">·</span>
        <span className="font-mono font-semibold">{slotTimeLabel(slotId, DELAY_MINUTES * 2)}</span>
        <span>→ IG</span>
        {isContentReady && (
          <span className="ml-auto text-sky-500 font-semibold">
            ✓ Sẵn sàng đăng
          </span>
        )}
        {record?.overallStatus === "waiting_for_ai" && (
          <span className="ml-auto text-violet-500 font-semibold animate-pulse">
            ⚡ Đang soạn AI…
          </span>
        )}
      </div>
      {/* Platform rows */}

      <div>
        {PLATFORMS.map((p) => {
          const scheduledTime = slotTimeLabel(slotId, p.delayMin);
          const slotDate = slotDateToday(slotId, p.delayMin);
          const platformResult = record
            ? (record[p.key as "facebook" | "threads" | "instagram"] ?? null)
            : null;
          return (
            <PlatformScheduleRow
              key={p.key}
              platformLabel={p.label}
              scheduledTime={scheduledTime}
              result={platformResult}
              isPast={now > slotDate}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Puter sign-out button ────────────────────────────────────

function PuterSignOutButton() {
  const username = usePuterUser();
  return (
    <div className="flex items-center gap-1.5">
      {username && (
        <span className="text-[10px] text-violet-400 font-mono hidden sm:inline">
          @{username}
        </span>
      )}
      <button
        onClick={puterSignOut}
        className="text-[10px] px-2 py-0.5 rounded-md border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors whitespace-nowrap"
      >
        Đăng xuất Puter
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export function AutoSchedulerMonitor() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [records, setRecords] = useState<AutoPostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiGeneratingId, setAiGeneratingId] = useState<string | null>(null);
  const processingRef = useRef<Set<string>>(new Set());
  const initialFetched = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [s, h] = await Promise.all([
        fetch("/api/auto-scheduler").then((r) => r.json()),
        fetch("/api/auto-scheduler?view=history&today=true").then((r) =>
          r.json(),
        ),
      ]);
      if (s.success) setStatus(s.data);
      if (h.success) setRecords(h.data as AutoPostRecord[]);
    } catch {
      setError("Không thể tải dữ liệu");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Soạn AI bằng Puter.js và submit lên server
  const generateAndSubmit = useCallback(
    async (record: AutoPostRecord) => {
      if (processingRef.current.has(record.id)) return;
      processingRef.current.add(record.id);
      setAiGeneratingId(record.id);

      try {
        // Lấy AI model hiện tại
        const cfgRes = await fetch("/api/ai-config").then((r) => r.json());
        const model: string =
          cfgRes.data?.currentProvider?.model ?? "gpt-4o-mini";

        // Puter.js helper
        const puterRef =
          typeof window !== "undefined"
            ? (
                window as Window & {
                  puter?: {
                    ai: {
                      chat: (
                        ...args: unknown[]
                      ) => Promise<AsyncIterable<{ text: string }>>;
                    };
                  };
                }
              ).puter
            : undefined;
        if (!puterRef)
          throw new Error("Puter.js chưa tải. Vui lòng tải lại trang.");

        // Helper: gọi Puter.js + parse JSON output
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

          let content = accumulated;
          try {
            const parsed = JSON.parse(accumulated);
            content = parsed.content ?? parsed.fullPost ?? accumulated;
          } catch {
            // không phải JSON — dùng nguyên
          }
          return content.trim();
        };

        // ── Step 1: Facebook (550-850 ký tự) ──────────────────────
        const fbPromptRes = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "facebook" }),
        });
        const fbPromptJson = await fbPromptRes.json();
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

        // ── Step 2: Threads (≤480 ký tự, cùng topic) ─────────────
        const thPromptRes = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "threads", topic: topicId }),
        });
        const thPromptJson = await thPromptRes.json();
        if (!thPromptJson.success)
          throw new Error(
            thPromptJson.error ?? "Không thể build Threads prompt",
          );

        const { systemPrompt: thSys, userPrompt: thUser } =
          thPromptJson.data as { systemPrompt: string; userPrompt: string };

        let threadsContent = await generateContent(thSys, thUser);
        if (!threadsContent) threadsContent = fbContent; // fallback
        threadsContent = threadsContent.slice(0, 480); // safety clamp

        // ── Step 3: Instagram caption (từ bài FB) ─────────────────
        const igPromptRes = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "instagram", fbContent }),
        });
        const igPromptJson = await igPromptRes.json();
        if (!igPromptJson.success)
          throw new Error(igPromptJson.error ?? "Không thể build IG prompt");

        const { systemPrompt: igSys, userPrompt: igUser } =
          igPromptJson.data as { systemPrompt: string; userPrompt: string };

        let igCaption = await generateContent(igSys, igUser);
        if (!igCaption) igCaption = fbContent.slice(0, 250); // fallback

        const submitRes = await fetch("/api/auto-scheduler", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recordId: record.id,
            fbContent,
            threadsContent,
            igCaption,
            topicLabel,
          }),
        });
        const submitJson = await submitRes.json();
        if (!submitJson.success)
          throw new Error(submitJson.error ?? "Submit thất bại");

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
    // Guard against React StrictMode double-mount creating 2 intervals
    if (initialFetched.current) return;
    initialFetched.current = true;

    fetchData(true); // show spinner only on first load

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
    if (waiting) {
      generateAndSubmit(waiting);
    }
  }, [records, generateAndSubmit]);

  function todayRecord(slotId: string): AutoPostRecord | null {
    return (
      records.find((r) => r.slot === slotId && isTodayVN(r.triggeredAt)) ?? null
    );
  }


  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                Đăng tự động 3 nền tảng
              </h2>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {[
                {
                  label: "Facebook",
                  color: "text-blue-500 bg-blue-50 border-blue-100",
                },
                {
                  label: "Threads",
                  color: "text-slate-600 bg-slate-50 border-slate-200",
                },
                {
                  label: "Instagram",
                  color: "text-pink-500 bg-pink-50 border-pink-100",
                },
              ].map((p) => (
                <span
                  key={p.label}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${p.color}`}
                >
                  {p.label}
                </span>
              ))}
              {status?.slots && (
                <span className="text-[10px] text-slate-400">
                  · {status.slots.length} khung giờ/ngày
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="px-5 py-4 space-y-4">
        {error && <p className="text-xs text-rose-500">{error}</p>}

        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Lịch hôm nay — {todayLabel()}
          </p>
          {aiGeneratingId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
              <Spinner className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs text-violet-600">
                Đang soạn nội dung bằng Puter.js AI…
              </span>
            </div>
          )}
          {loading && records.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner className="w-5 h-5 text-slate-300" />
            </div>
          ) : (
            <div className="space-y-2">
                <TodaySlotCard slotId="morning" record={todayRecord("morning")} />
              <TodaySlotCard slotId="noon" record={todayRecord("noon")} />
              <TodaySlotCard slotId="evening" record={todayRecord("evening")} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 border-t border-slate-50 text-[9px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Đã đăng
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            Thất bại
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Đang xử lý
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
            Đã lên lịch
          </span>
        </div>
      </div>
    </section>
  );
}
