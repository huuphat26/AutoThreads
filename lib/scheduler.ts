import cron, { ScheduledTask } from "node-cron";
import { generateContent } from "./content-generator";
import { resolveTopicOrRandom } from "./topics";
import { postToThreads } from "./threads-api";
import { upsertPost, generateId } from "./store";
import type { ScheduledPost } from "@/types";

// ─── Chế độ TEST: đăng mỗi N phút ─────────────────────────────
// Đặt TEST_MODE_INTERVAL_MIN trong .env để bật (ví dụ: 10)
// Nếu không set hoặc = 0 → dùng lịch production (CRON_SCHEDULES)
const TEST_INTERVAL_MIN = parseInt(
  process.env.TEST_MODE_INTERVAL_MIN || "0",
  10,
);

function parseProductionSchedules(): Array<{
  id: string;
  label: string;
  cron: string;
}> {
  const raw = process.env.CRON_SCHEDULES || "";
  if (!raw.trim()) return [];
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

const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

let scheduledJobs: ScheduledTask[] = [];
let schedulerPaused = false;

/**
 * Thực hiện đăng bài
 */
async function executePost(): Promise<void> {
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

    console.error(`[AutoThreads] ❌ Đăng thất bại: ${errMsg}`);
  }
}

/**
 * Khởi động tất cả cron jobs
 */
export function startScheduler(): void {
  if (scheduledJobs.length > 0) {
    console.log("[AutoThreads] Scheduler đã chạy rồi, bỏ qua.");
    return;
  }

  const enabled = process.env.SCHEDULER_ENABLED === "true";
  if (!enabled) {
    console.log("[AutoThreads] Scheduler bị tắt (SCHEDULER_ENABLED=false).");
    return;
  }

  console.log(`[AutoThreads] ⏰ Khởi động Scheduler (Timezone: ${TIMEZONE})`);

  // ─── TEST MODE: đăng mỗi N phút ───────────────────────────
  if (TEST_INTERVAL_MIN > 0) {
    const cronExpr = `0 */${TEST_INTERVAL_MIN} * * * *`; // mỗi N phút
    const task = cron.schedule(
      cronExpr,
      () => {
        console.log(`[AutoThreads] 🧪 TEST MODE — Đăng bài`);
        executePost();
      },
      { timezone: TIMEZONE },
    );
    scheduledJobs.push(task);
    console.log(
      `[AutoThreads] 🧪 TEST MODE: đăng mỗi ${TEST_INTERVAL_MIN} phút (${cronExpr})`,
    );
    return;
  }

  const schedules = parseProductionSchedules();
  if (schedules.length === 0) {
    console.log(
      "[AutoThreads] ⚠ Không có lịch nào. Hãy thêm biến môi trường CRON_SCHEDULES.",
    );
    return;
  }
  for (const schedule of schedules) {
    const task = cron.schedule(
      schedule.cron,
      () => {
        console.log(`[AutoThreads] 🔔 Đăng bài theo lịch: ${schedule.label}`);
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
  schedulerPaused = false;
  console.log("[AutoThreads] Scheduler đã dừng.");
}

/**
 * Tạm dừng tất cả cron jobs (giữ nguyên lịch, chỉ suspend)
 */
export function pauseScheduler(): void {
  if (schedulerPaused) return;
  scheduledJobs.forEach((job) => job.stop());
  schedulerPaused = true;
  console.log("[AutoThreads] ⏸ Scheduler đã tạm dừng.");
}

/**
 * Tiếp tục các cron jobs sau khi tạm dừng
 */
export function resumeScheduler(): void {
  if (!schedulerPaused) return;
  scheduledJobs.forEach((job) => job.start());
  schedulerPaused = false;
  console.log("[AutoThreads] ▶ Scheduler tiếp tục chạy.");
}

/**
 * Đăng bài thủ công ngay lập tức (cho mục đích test)
 */
export async function triggerManualPost(): Promise<string> {
  await executePost();
  return "Đã kích hoạt đăng bài thủ công";
}

/**
 * Lấy thông tin trạng thái scheduler
 */
export function getSchedulerStatus() {
  const isTestMode = TEST_INTERVAL_MIN > 0;
  const schedules = isTestMode ? [] : parseProductionSchedules();
  return {
    enabled: process.env.SCHEDULER_ENABLED === "true",
    running: scheduledJobs.length > 0,
    paused: schedulerPaused,
    testMode: isTestMode,
    testIntervalMin: isTestMode ? TEST_INTERVAL_MIN : null,
    jobs: isTestMode
      ? [
          {
            id: "test",
            cronExpression: `*/${TEST_INTERVAL_MIN} * * * *`,
            label: `Test: mỗi ${TEST_INTERVAL_MIN} phút`,
          },
        ]
      : schedules.map((s) => ({
          id: s.id,
          cronExpression: s.cron,
          label: s.label,
        })),
    timezone: TIMEZONE,
    jobCount: scheduledJobs.length,
  };
}
