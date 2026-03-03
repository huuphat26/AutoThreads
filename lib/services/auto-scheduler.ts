// ============================================================
// AUTO THREADS — Multi-Platform Auto Scheduler
// Chạy lúc 12:00 và 18:00 mỗi ngày (Asia/Ho_Chi_Minh).
// Flow: AI soạn nội dung → FB → (2 phút) → Threads → (2 phút) → IG
// Tách biệt hoàn toàn với Threads scheduler (lib/scheduler.ts)
// và các FB/IG scheduler hẹn giờ thủ công.
// ============================================================
import cron from "node-cron";
import { generateContent, generateIGCaption } from "@/lib/content-generator";
import { facebookService } from "@/lib/services/facebook.service";
import { threadsService } from "@/lib/services/threads.service";
import { instagramService } from "@/lib/services/instagram.service";
import { getNextIGImage } from "@/lib/ig-image-pool";
import {
  upsertAutoRecord,
  generateAutoId,
  getAllAutoRecords,
} from "@/lib/auto-post-store";
import type { AutoPostRecord, AutoPostSlot } from "@/types";

// ─── Constants ────────────────────────────────────────────────
const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";
/** Khoảng cách giữa các nền tảng (ms) */
const PLATFORM_DELAY_MS = 2 * 60 * 1000; // 2 phút

const SLOTS = [
  { id: "noon" as AutoPostSlot, label: "Buổi trưa (12:00)", cron: "0 12 * * *" },
  { id: "evening" as AutoPostSlot, label: "Buổi tối (18:00)", cron: "0 18 * * *" },
];

// ─── Global guard ─────────────────────────────────────────────
const _g = global as typeof global & { __autoSchedulerStarted?: boolean };

// ─── Sleep ────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Core execution ───────────────────────────────────────────

/**
 * Thực thi một lần auto-post đầy đủ (3 nền tảng tuần tự).
 * FB → 2 phút → Threads → 2 phút → IG
 *
 * @param slot - "noon" | "evening" (để phân biệt log)
 */
export async function executeAutoPost(slot: AutoPostSlot = "noon"): Promise<AutoPostRecord> {
  const recordId = generateAutoId();
  const triggeredAt = new Date().toISOString();

  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(`[AutoScheduler] 🚀 Bắt đầu auto-post [${slot}] — ${triggeredAt}`);
  console.log(`[AutoScheduler] ═══════════════════════════════════`);

  // ── Khởi tạo record ──────────────────────────────────────────
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
    overallStatus: "running",
  };
  upsertAutoRecord(record);

  // ── Bước 1: AI soạn nội dung ─────────────────────────────────
  let fullPost = "";
  let topicLabel = "";
  let topicId = "";

  try {
    console.log(`[AutoScheduler] 🤖 Đang soạn nội dung với AI...`);
    const generated = await generateContent();
    fullPost = generated.fullPost;
    topicLabel = generated.topicLabel ?? "";
    topicId = generated.topicLabel ?? "";

    record.content = fullPost;
    record.topic = topicId;
    record.topicLabel = topicLabel;
    upsertAutoRecord(record);

    console.log(`[AutoScheduler] ✅ AI soạn xong — chủ đề: ${topicLabel}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AutoScheduler] ❌ AI thất bại: ${msg}`);

    record.facebook = { status: "failed", errorMessage: `AI thất bại: ${msg}` };
    record.threads = { status: "failed", errorMessage: `AI thất bại: ${msg}` };
    record.instagram = { status: "failed", errorMessage: `AI thất bại: ${msg}` };
    record.overallStatus = "failed";
    upsertAutoRecord(record);
    return record;
  }

  // ── Bước 2: Đăng Facebook ─────────────────────────────────────
  console.log(`\n[AutoScheduler] 📘 [1/3] Đăng lên Facebook...`);
  try {
    const fbResult = await facebookService.publishText(fullPost);
    const fbPostId = fbResult.kind !== "video" ? fbResult.postId : undefined;
    const fbPermalink = fbResult.kind !== "video" ? (fbResult.permalink ?? undefined) : undefined;

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
    const tResult = await threadsService.publishTextPost(fullPost);
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

    // 4b. AI tạo IG caption ngắn
    let igCaption = "";
    try {
      igCaption = await generateIGCaption(fullPost, topicLabel);
      record.igCaption = igCaption;
      upsertAutoRecord(record);
      console.log(`[AutoScheduler] 🤖 IG caption OK (${igCaption.length} chars)`);
    } catch (err) {
      // Fallback: dùng 280 ký tự đầu của fullPost
      igCaption = fullPost.slice(0, 280);
      record.igCaption = igCaption;
      console.warn(`[AutoScheduler] ⚠️ IG caption AI thất bại, dùng fallback`);
    }

    // 4c. Đăng lên Instagram
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
      console.log(`[AutoScheduler] ✅ Instagram OK — Media ID: ${igResult.mediaId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      record.instagram = { status: "failed", errorMessage: msg };
      upsertAutoRecord(record);
      console.error(`[AutoScheduler] ❌ Instagram thất bại: ${msg}`);
    }
  }

  // ── Bước 5: Tính overallStatus ────────────────────────────────
  const results = [record.facebook.status, record.threads.status, record.instagram.status];
  const allPosted = results.every((s) => s === "posted");
  const allFailed = results.every((s) => s === "failed");

  record.overallStatus = allPosted ? "completed" : allFailed ? "failed" : "partial";
  upsertAutoRecord(record);

  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(
    `[AutoScheduler] ${record.overallStatus === "completed" ? "🎉" : record.overallStatus === "partial" ? "⚠️" : "❌"} Kết thúc [${slot}] — ${record.overallStatus.toUpperCase()}`,
  );
  console.log(`[AutoScheduler]   FB      : ${record.facebook.status}`);
  console.log(`[AutoScheduler]   Threads : ${record.threads.status}`);
  console.log(`[AutoScheduler]   IG      : ${record.instagram.status}`);
  console.log(`[AutoScheduler] ═══════════════════════════════════\n`);

  return record;
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
        executeAutoPost(slot.id).catch((err) => {
          console.error(`[AutoScheduler] ❌ Lỗi không mong đợi [${slot.id}]:`, err);
        });
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
export async function triggerAutoPost(slot: AutoPostSlot = "noon"): Promise<AutoPostRecord> {
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
