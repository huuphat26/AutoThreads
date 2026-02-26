// ============================================
// AUTO THREADS - Scheduler (node-cron)
// ============================================
import cron, { ScheduledTask } from "node-cron";
import { generateContent, getTopicForSlot } from "./content-generator";
import { postToThreads } from "./threads-api";
import { upsertPost, generateId } from "./store";
import type { PostSlot, ScheduledPost } from "@/types";

// ─── Chế độ TEST: đăng mỗi 10 phút ────────────────────────────
// Đặt TEST_MODE_INTERVAL_MIN trong .env để bật (ví dụ: 10)
// Nếu không set hoặc = 0 → dùng lịch 3 khung giờ bình thường
const TEST_INTERVAL_MIN = parseInt(
  process.env.TEST_MODE_INTERVAL_MIN || "0",
  10,
);

// Lịch đăng bài production: 3 khung giờ mỗi ngày (múi giờ VN)
const SCHEDULE_CONFIG: Record<PostSlot, { cron: string; label: string }> = {
  morning: { cron: "0 30 7 * * *", label: "07:30 Sáng" },
  noon: { cron: "0 0 12 * * *", label: "12:00 Trưa" },
  evening: { cron: "0 0 18 * * *", label: "18:00 Tối" },
};

const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

// Slots xoay vòng khi chạy test mode
const SLOTS_ROTATION: PostSlot[] = ["morning", "noon", "evening"];
let testRotationIndex = 0;

let scheduledJobs: ScheduledTask[] = [];

/**
 * Thực hiện đăng bài cho một khung giờ
 */
async function executePost(slot: PostSlot): Promise<void> {
  const postId = generateId();
  const scheduledAt = new Date().toISOString();

  // Lưu trạng thái pending
  const pendingPost: ScheduledPost = {
    id: postId,
    content: "",
    topic: getTopicForSlot(slot),
    slot,
    scheduledAt,
    status: "pending",
  };
  upsertPost(pendingPost);

  console.log(
    `[AutoThreads] 🚀 Bắt đầu đăng bài (${SCHEDULE_CONFIG[slot].label}) - ${scheduledAt}`,
  );

  try {
    // Bước 1: Tạo nội dung bằng AI
    const generated = await generateContent({
      topic: pendingPost.topic,
      slot,
    });

    // Bước 2: Đăng lên Threads
    const threadsPostId = await postToThreads(generated.fullPost);

    // Bước 3: Cập nhật trạng thái thành công
    upsertPost({
      ...pendingPost,
      content: generated.fullPost,
      threadsPostId,
      postedAt: new Date().toISOString(),
      status: "posted",
    });

    console.log(
      `[AutoThreads] ✅ Đăng thành công! Threads Post ID: ${threadsPostId}`,
    );
    console.log(
      `[AutoThreads] 📝 Nội dung: ${generated.content.slice(0, 80)}...`,
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Cập nhật trạng thái thất bại
    upsertPost({
      ...pendingPost,
      status: "failed",
      errorMessage: errMsg,
    });

    console.error(`[AutoThreads] ❌ Đăng thất bại (${slot}): ${errMsg}`);
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
        const slot = SLOTS_ROTATION[testRotationIndex % SLOTS_ROTATION.length];
        testRotationIndex++;
        console.log(
          `[AutoThreads] 🧪 TEST MODE — Đăng bài #${testRotationIndex} (slot: ${slot})`,
        );
        executePost(slot);
      },
      { timezone: TIMEZONE },
    );
    scheduledJobs.push(task);
    console.log(
      `[AutoThreads] 🧪 TEST MODE: đăng mỗi ${TEST_INTERVAL_MIN} phút (${cronExpr})`,
    );
    return;
  }

  // ─── PRODUCTION MODE: 3 khung giờ cố định ─────────────────
  for (const [slotKey, config] of Object.entries(SCHEDULE_CONFIG)) {
    const slot = slotKey as PostSlot;
    const task = cron.schedule(
      config.cron,
      () => {
        executePost(slot);
      },
      {
        timezone: TIMEZONE,
      },
    );
    scheduledJobs.push(task);
    console.log(
      `[AutoThreads]  → Đã lên lịch: ${config.label} (${config.cron})`,
    );
  }
}

/**
 * Dừng tất cả cron jobs
 */
export function stopScheduler(): void {
  scheduledJobs.forEach((job) => job.stop());
  scheduledJobs = [];
  console.log("[AutoThreads] Scheduler đã dừng.");
}

/**
 * Đăng bài thủ công ngay lập tức (cho mục đích test)
 */
export async function triggerManualPost(slot: PostSlot): Promise<string> {
  await executePost(slot);
  return `Đã đăng bài cho slot: ${SCHEDULE_CONFIG[slot].label}`;
}

/**
 * Lấy thông tin trạng thái scheduler
 */
export function getSchedulerStatus() {
  const isTestMode = TEST_INTERVAL_MIN > 0;
  return {
    enabled: process.env.SCHEDULER_ENABLED === "true",
    running: scheduledJobs.length > 0,
    testMode: isTestMode,
    testIntervalMin: isTestMode ? TEST_INTERVAL_MIN : null,
    jobs: isTestMode
      ? [
          {
            slot: "test" as PostSlot,
            cronExpression: `*/${TEST_INTERVAL_MIN} * * * *`,
            label: `Test: mỗi ${TEST_INTERVAL_MIN} phút`,
          },
        ]
      : Object.entries(SCHEDULE_CONFIG).map(([slot, config]) => ({
          slot: slot as PostSlot,
          cronExpression: config.cron,
          label: config.label,
        })),
    timezone: TIMEZONE,
    jobCount: scheduledJobs.length,
  };
}
