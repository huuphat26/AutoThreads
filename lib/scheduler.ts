import cron, { ScheduledTask } from "node-cron";
import { generateContent } from "./content-generator";
import { resolveTopicOrRandom } from "./topics";
import { postToThreads } from "./threads-api";
import {
  upsertPost,
  generateId,
  isSchedulerPaused,
  setSchedulerPaused,
  readHistory,
  skipSlot,
  getSkippedSlotIds,
} from "./store";
import type { ScheduledPost } from "@/types";

const DEFAULT_SCHEDULES: Array<{ id: string; label: string; cron: string }> = [
  { id: "morning", label: "Buổi sáng (06:30)", cron: "30 6 * * *" },
  { id: "lunch", label: "Buổi trưa (11:00)", cron: "0 11 * * *" },
  { id: "evening", label: "Buổi tối  (17:00)", cron: "0 17 * * *" },
];

const DAILY_POST_LIMIT = 3;

function parseProductionSchedules(): Array<{
  id: string;
  label: string;
  cron: string;
}> {
  const raw = process.env.CRON_SCHEDULES || "";
  if (!raw.trim()) return DEFAULT_SCHEDULES;
  return raw
    .split(";")
    .map((entry, i) => {
      const [label, cronExpr] = entry.split("|").map((s) => s.trim());
      return cronExpr
        ? { id: `job-${i}`, label: label || `Job ${i + 1}`, cron: cronExpr }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function getTodayPostedCount(): number {
  const history = readHistory();
  const todayKey = new Date().toLocaleDateString("sv", { timeZone: TIMEZONE });
  return history.posts.filter(
    (p) =>
      p.status === "posted" &&
      p.postedAt &&
      new Date(p.postedAt).toLocaleDateString("sv", { timeZone: TIMEZONE }) ===
        todayKey,
  ).length;
}

const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

let scheduledJobs: ScheduledTask[] = [];
let serverStartedAt: string | undefined;

/**
 * Thực hiện đăng bài
 * @param manual - true = đăng thủ công (bỏ qua giới hạn ngày)
 */
async function executePost(manual = false): Promise<void> {
  // Kiểm tra giới hạn bài / ngày (chỉ áp dụng cho lịch tự động)
  if (!manual) {
    const todayCount = getTodayPostedCount();
    if (todayCount >= DAILY_POST_LIMIT) {
      console.log(
        `[AutoThreads] ⛔ Đã đăng ${todayCount}/${DAILY_POST_LIMIT} bài hôm nay, bỏ qua.`,
      );
      return;
    }
  }
  const postId = generateId();
  const scheduledAt = new Date().toISOString();
  const topic = resolveTopicOrRandom(); // random topic mỗi lần đăng

  // Lưu trạng thái pending
  const pendingPost: ScheduledPost = {
    id: postId,
    content: "",
    topic: topic.id,
    scheduledAt,
    status: "pending",
    source: "auto",
  };
  upsertPost(pendingPost);

  console.log(`[AutoThreads] 🚀 Bắt đầu đăng bài - ${scheduledAt}`);

  try {
    // Bước 1: Tạo nội dung bằng AI (topic đã chọn, không truyền slot)
    const generated = await generateContent({ topic: topic.id });

    // Bước 2: Đăng lên Threads
    const threadsPostId = await postToThreads(generated.fullPost);

    // Bước 3: Cập nhật trạng thái thành công
    upsertPost({
      ...pendingPost,
      content: generated.fullPost,
      threadsPostId,
      postedAt: new Date().toISOString(),
      status: "posted",
      topicLabel: generated.topicLabel,
    });

    console.log(
      `[AutoThreads] ✅ Đăng thành công! Threads Post ID: ${threadsPostId}`,
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Cập nhật trạng thái thất bại
    upsertPost({
      ...pendingPost,
      status: "failed",
      errorMessage: errMsg,
    });
  }
}

/**
 * Khởi động tất cả cron jobs
 */
export function startScheduler(): void {
  const enabled = process.env.SCHEDULER_ENABLED === "true";
  if (!enabled) {
    console.log("[AutoThreads] Scheduler bị tắt (SCHEDULER_ENABLED=false).");
    return;
  }

  serverStartedAt = new Date().toISOString();
  console.log(`[AutoThreads] ⏰ Khởi động Scheduler (Timezone: ${TIMEZONE})`);

  const schedules = parseProductionSchedules();
  for (const schedule of schedules) {
    const task = cron.schedule(
      schedule.cron,
      () => {
        executePost();
      },
      { timezone: TIMEZONE },
    );
    scheduledJobs.push(task);
    console.log(
      `[AutoThreads]  → Đã lên lịch: ${schedule.label} (${schedule.cron})`,
    );
  }
}

/**
 * Dừng tất cả cron jobs
 */
export function stopScheduler(): void {
  scheduledJobs.forEach((job) => job.stop());
  scheduledJobs = [];
  setSchedulerPaused(false);
  console.log("[AutoThreads] Scheduler đã dừng.");
}

/**
 * Tạm dừng tất cả cron jobs (giữ nguyên lịch, chỉ suspend)
 */
export function pauseScheduler(): void {
  if (isSchedulerPaused()) return;
  scheduledJobs.forEach((job) => job.stop());
  setSchedulerPaused(true);
  console.log("[AutoThreads] ⏸ Scheduler đã tạm dừng.");
}

/**
 * Tiếp tục các cron jobs sau khi tạm dừng
 */
export function resumeScheduler(): void {
  if (!isSchedulerPaused()) return;
  scheduledJobs.forEach((job) => job.start());
  setSchedulerPaused(false);
  console.log("[AutoThreads] ▶ Scheduler tiếp tục chạy.");
}

/**
 * Đăng bài thủ công ngay lập tức (cho mục đích test)
 * Bỏ qua giới hạn số bài / ngày.
 */
export async function triggerManualPost(): Promise<string> {
  await executePost(true);
  return "Đã kích hoạt đăng bài thủ công";
}

/**
 * Lấy thông tin trạng thái scheduler
 */
/** Đánh dấu slot bị bỏ qua trong ngày hôm nay */
export function skipSchedulerSlot(slotId: string): void {
  skipSlot(slotId, TIMEZONE);
}

export function getSchedulerStatus() {
  const schedules = parseProductionSchedules();
  const todayPosted = getTodayPostedCount();
  return {
    enabled: process.env.SCHEDULER_ENABLED === "true",
    running: scheduledJobs.length > 0,
    paused: isSchedulerPaused(),
    dailyPostLimit: DAILY_POST_LIMIT,
    todayPosted,
    skippedSlots: getSkippedSlotIds(TIMEZONE),
    jobs: schedules.map((s) => ({
      id: s.id,
      cronExpression: s.cron,
      label: s.label,
    })),
    timezone: TIMEZONE,
    jobCount: scheduledJobs.length,
    serverStartedAt,
  };
}
