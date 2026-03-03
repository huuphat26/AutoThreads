// ============================================================
// AUTO THREADS — Multi-Platform Auto Scheduler
// Chạy lúc 13:00 và 18:00 mỗi ngày (Asia/Ho_Chi_Minh).
// Flow: AI soạn nội dung → FB → (2 phút) → Threads → (2 phút) → IG
// Tách biệt hoàn toàn với Threads scheduler (lib/scheduler.ts)
// và các FB/IG scheduler hẹn giờ thủ công.
// ============================================================
import cron from "node-cron";
import { facebookService } from "@/lib/services/facebook.service";
import { threadsService } from "@/lib/services/threads.service";
import { instagramService } from "@/lib/services/instagram.service";
import { getNextIGImage } from "@/lib/ig-image-pool";
import {
  upsertAutoRecord,
  generateAutoId,
  getAutoRecord,
  getAllAutoRecords,
} from "@/lib/auto-post-store";
import type { AutoPostRecord, AutoPostSlot } from "@/types";

// ─── Constants ────────────────────────────────────────────────
const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";
/** Khoảng cách giữa các nền tảng (ms) */
const PLATFORM_DELAY_MS = 2 * 60 * 1000; // 2 phút

const SLOTS = [
  {
    id: "noon" as AutoPostSlot,
    label: "Buổi trưa (14:15)",
    cron: "15 14 * * *",
  },
  {
    id: "evening" as AutoPostSlot,
    label: "Buổi tối (18:00)",
    cron: "0 18 * * *",
  },
];

// ─── Global guard ─────────────────────────────────────────────
const _g = global as typeof global & { __autoSchedulerStarted?: boolean };

// ─── Sleep ────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Core execution ───────────────────────────────────────────

/**
 * PHASE 1 — Tạo record chờ browser soạn AI.
 * Gọi từ cron job — trả về ngay, không block.
 * Browser sẽ detect trạng thái "waiting_for_ai" và soạn nội dung bằng Puter.js.
 */
export function startWaitingForAI(slot: AutoPostSlot = "noon"): AutoPostRecord {
  const recordId = generateAutoId();
  const triggeredAt = new Date().toISOString();

  const record: AutoPostRecord = {
    id: recordId,
    slot,
    triggeredAt,
    topic: "",
    topicLabel: undefined,
    content: "",
    igCaption: "",
    igImageUrl: undefined,
    facebook: { status: "pending" },
    threads: { status: "pending" },
    instagram: { status: "pending" },
    overallStatus: "waiting_for_ai",
  };
  upsertAutoRecord(record);

  console.log(`\n[AutoScheduler] ⏳ Chờ AI từ browser [${slot}] — ${recordId}`);
  return record;
}

/**
 * PHASE 2 — Nhận content từ browser, tiến hành đăng lên 3 nền tảng.
 * Gọi từ API route sau khi browser submit nội dung AI.
 */
export async function executePlatformPosts(
  recordId: string,
  fbContent: string,
  threadsContent: string,
  igCaption: string,
  topicLabel = "",
): Promise<AutoPostRecord> {
  const existing = getAutoRecord(recordId);
  if (!existing) throw new Error(`Record ${recordId} không tìm thấy`);
  if (existing.overallStatus !== "waiting_for_ai") {
    console.warn(
      `[AutoScheduler] Record ${recordId} không ở trạng thái waiting_for_ai (${existing.overallStatus}), bỏ qua`,
    );
    return existing;
  }

  const record = { ...existing };
  record.content = fbContent;
  record.igCaption = igCaption;
  record.topicLabel = topicLabel || record.topicLabel;
  record.overallStatus = "running";
  record.facebook = { status: "pending" };
  record.threads = { status: "pending" };
  record.instagram = { status: "pending" };
  upsertAutoRecord(record);

  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(
    `[AutoScheduler] 🚀 Bắt đầu đăng bài [${record.slot}] (content từ browser)`,
  );
  console.log(`[AutoScheduler] ═══════════════════════════════════`);

  // ── Đăng Facebook ─────────────────────────────────────────────
  console.log(`\n[AutoScheduler] 📘 [1/3] Đăng lên Facebook...`);
  try {
    const fbResult = await facebookService.publishText(fbContent);
    const fbPostId = fbResult.kind !== "video" ? fbResult.postId : undefined;
    const fbPermalink =
      fbResult.kind !== "video" ? (fbResult.permalink ?? undefined) : undefined;

    record.facebook = {
      status: "posted",
      postId: fbPostId,
      permalinkUrl: fbPermalink ?? undefined,
      postedAt: new Date().toISOString(),
    };
    upsertAutoRecord(record);
    console.log(`[AutoScheduler] ✅ Facebook OK — Post ID: ${fbPostId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record.facebook = { status: "failed", errorMessage: msg };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Facebook thất bại: ${msg}`);
    // Không dừng — tiếp tục Threads & IG
  }

  // ── Chờ 2 phút ────────────────────────────────────────────────
  console.log(`[AutoScheduler] ⏳ Chờ 2 phút trước khi đăng Threads...`);
  await sleep(PLATFORM_DELAY_MS);

  // ── Bước 3: Đăng Threads ──────────────────────────────────────
  console.log(`\n[AutoScheduler] 🧵 [2/3] Đăng lên Threads...`);
  try {
    // Safety clamp: Threads hard-limits 500 chars
    const tResult = await threadsService.publishTextPost(
      threadsContent.slice(0, 480),
    );
    record.threads = {
      status: "posted",
      postId: tResult.postId,
      postedAt: new Date().toISOString(),
    };
    upsertAutoRecord(record);
    console.log(`[AutoScheduler] ✅ Threads OK — Post ID: ${tResult.postId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record.threads = { status: "failed", errorMessage: msg };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Threads thất bại: ${msg}`);
  }

  // ── Chờ 2 phút ────────────────────────────────────────────────
  console.log(`[AutoScheduler] ⏳ Chờ 2 phút trước khi đăng Instagram...`);
  await sleep(PLATFORM_DELAY_MS);

  // ── Bước 4: Đăng Instagram ────────────────────────────────────
  console.log(`\n[AutoScheduler] 📸 [3/3] Đăng lên Instagram...`);

  // 4a. Lấy ảnh từ pool (round-robin)
  const igImage = getNextIGImage();
  if (!igImage) {
    record.instagram = {
      status: "failed",
      errorMessage: "Pool ảnh IG trống. Thêm URL vào data/ig-auto-images.json",
    };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Instagram thất bại: pool ảnh trống`);
  } else {
    record.igImageUrl = igImage.url;
    // igCaption đã được browser soạn sẵn
    console.log(`[AutoScheduler] 🤖 IG caption (${igCaption.length} chars)`);

    // 4b. Đăng lên Instagram
    try {
      const igResult = await instagramService.publish({
        caption: igCaption,
        mediaType: "IMAGE",
        imageUrl: igImage.url,
      });

      record.instagram = {
        status: "posted",
        postId: igResult.mediaId,
        permalinkUrl: igResult.permalink ?? undefined,
        postedAt: new Date().toISOString(),
      };
      upsertAutoRecord(record);
      console.log(
        `[AutoScheduler] ✅ Instagram OK — Media ID: ${igResult.mediaId}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      record.instagram = { status: "failed", errorMessage: msg };
      upsertAutoRecord(record);
      console.error(`[AutoScheduler] ❌ Instagram thất bại: ${msg}`);
    }
  }

  // ── Bước 5: Tính overallStatus ────────────────────────────────
  const results = [
    record.facebook.status,
    record.threads.status,
    record.instagram.status,
  ];
  const allPosted = results.every((s) => s === "posted");
  const allFailed = results.every((s) => s === "failed");

  record.overallStatus = allPosted
    ? "completed"
    : allFailed
      ? "failed"
      : "partial";
  upsertAutoRecord(record);

  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(
    `[AutoScheduler] ${
      record.overallStatus === "completed"
        ? "🎉"
        : record.overallStatus === "partial"
          ? "⚠️"
          : "❌"
    } Kết thúc [${record.slot}] — ${record.overallStatus.toUpperCase()}`,
  );
  console.log(`[AutoScheduler]   FB      : ${record.facebook.status}`);
  console.log(`[AutoScheduler]   Threads : ${record.threads.status}`);
  console.log(`[AutoScheduler]   IG      : ${record.instagram.status}`);
  console.log(`[AutoScheduler] ═══════════════════════════════════\n`);

  return record;
}

/**
 * Backward-compat: trigger thủ công đầy đủ (dùng cho UI test trigger).
 * Vì đây là trigger thủ công (không phải cron), sẽ tạo waiting_for_ai
 * thay vì gọi server-side AI.
 */
export async function executeAutoPost(
  slot: AutoPostSlot = "noon",
): Promise<AutoPostRecord> {
  return startWaitingForAI(slot);
}

// ─── Scheduler lifecycle ──────────────────────────────────────

let _schedulerJobs: ReturnType<typeof cron.schedule>[] = [];

/**
 * Khởi động auto-scheduler.
 * Yêu cầu AUTO_SCHEDULER_ENABLED=true trong .env
 */
export function startAutoScheduler(): void {
  if (_g.__autoSchedulerStarted) {
    console.log("[AutoScheduler] ⚠️  Đã khởi động rồi, bỏ qua.");
    return;
  }

  const enabled = process.env.AUTO_SCHEDULER_ENABLED === "true";
  if (!enabled) {
    console.log(
      "[AutoScheduler] ⏸  Tắt (AUTO_SCHEDULER_ENABLED != true). Để bật: thêm AUTO_SCHEDULER_ENABLED=true vào .env",
    );
    return;
  }

  _g.__autoSchedulerStarted = true;

  for (const slot of SLOTS) {
    const job = cron.schedule(
      slot.cron,
      () => {
        // Phase 1: tạo record waiting_for_ai — browser sẽ tiếp nhận và soạn AI
        startWaitingForAI(slot.id);
      },
      { timezone: TIMEZONE },
    );
    _schedulerJobs.push(job);
    console.log(`[AutoScheduler] ✅ Đã lên lịch: ${slot.label} (${slot.cron})`);
  }

  console.log(
    `[AutoScheduler] 🟢 Multi-Platform Auto Scheduler đã khởi động (Timezone: ${TIMEZONE})`,
  );
}

export function stopAutoScheduler(): void {
  _schedulerJobs.forEach((j) => j.stop());
  _schedulerJobs = [];
  _g.__autoSchedulerStarted = false;
  console.log("[AutoScheduler] 🔴 Đã dừng.");
}

/**
 * Trigger thủ công (dùng để test trên UI hoặc API).
 * Không cần AUTO_SCHEDULER_ENABLED=true.
 */
export async function triggerAutoPost(
  slot: AutoPostSlot = "noon",
): Promise<AutoPostRecord> {
  console.log(`[AutoScheduler] 🔧 Trigger thủ công [${slot}]`);
  return executeAutoPost(slot);
}

/**
 * Lấy trạng thái scheduler để hiển thị trên UI
 */
export function getAutoSchedulerStatus() {
  const records = getAllAutoRecords();
  const lastRecord = records[0] ?? null;

  return {
    enabled: process.env.AUTO_SCHEDULER_ENABLED === "true",
    running: _schedulerJobs.length > 0,
    timezone: TIMEZONE,
    slots: SLOTS.map((s) => ({ id: s.id, label: s.label, cron: s.cron })),
    platformDelayMinutes: PLATFORM_DELAY_MS / 60_000,
    totalRuns: records.length,
    lastRun: lastRecord
      ? {
          id: lastRecord.id,
          triggeredAt: lastRecord.triggeredAt,
          slot: lastRecord.slot,
          overallStatus: lastRecord.overallStatus,
          topicLabel: lastRecord.topicLabel,
          facebook: lastRecord.facebook.status,
          threads: lastRecord.threads.status,
          instagram: lastRecord.instagram.status,
        }
      : null,
  };
}
