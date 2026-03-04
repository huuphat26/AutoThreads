// ============================================================
// AUTO THREADS — Multi-Platform Auto Scheduler
// ─── Lịch CHUẨN BỊ: 11:50 & 17:50 ─────────────────────────────
//   11:50 → Browser soạn AI nội dung FB
//   ~11:53 → Browser soạn AI nội dung Threads
//   ~11:55 → Browser soạn AI nội dung IG
//   → Lưu record "content_ready", chờ đến giờ đăng
// ─── Lịch ĐĂNG: 12:00 & 18:00 ──────────────────────────────────
//   12:00 → Đăng FB (retry tối đa 3 phút)
//   12:03 → Đăng Threads (retry tối đa 3 phút)
//   12:06 → Đăng IG (retry tối đa 3 phút)
// ─── Cơ chế lỗi ─────────────────────────────────────────────────
//   Mỗi nền tảng có 3 phút retry. Hết thời gian → đánh dấu failed
//   → tiếp tục nền tảng tiếp theo đúng lịch.
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
import { upsertFBPost } from "@/lib/services/fb-store";
import { upsertIGPost } from "@/lib/services/ig-store";
import type { AutoPostRecord, AutoPostSlot } from "@/types";

// ─── Constants ────────────────────────────────────────────────
const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";

/** Khoảng cách giữa các nền tảng trong giai đoạn ĐĂNG (ms) */
const PLATFORM_DELAY_MS = 3 * 60 * 1000; // 3 phút
/** Thời gian retry tối đa cho mỗi nền tảng (ms) */
const RETRY_WINDOW_MS = 3 * 60 * 1000; // 3 phút
/** Interval mỗi lần retry (ms) */
const RETRY_INTERVAL_MS = 30 * 1000; // 30 giây

const SLOTS = [
  {
    id: "noon" as AutoPostSlot,
    label: "Buổi trưa (12:00)",
    /** Chuẩn bị AI content: 11:50 */
    prepCron: "50 11 * * *",
    /** Bắt đầu đăng: 12:00 */
    postCron: "0 12 * * *",
  },
  {
    id: "evening" as AutoPostSlot,
    label: "Buổi tối (18:00)",
    /** Chuẩn bị AI content: 17:50 */
    prepCron: "50 17 * * *",
    /** Bắt đầu đăng: 18:00 */
    postCron: "0 18 * * *",
  },
];

// ─── Global guard ─────────────────────────────────────────────
const _g = global as typeof global & { __autoSchedulerStarted?: boolean };

// ─── Sleep ────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Retry helper ─────────────────────────────────────────────

/**
 * Thử thực hiện fn trong vòng RETRY_WINDOW_MS.
 * Mỗi lần thất bại sẽ chờ RETRY_INTERVAL_MS trước khi thử lại.
 * Nếu hết window → throw lỗi cuối cùng.
 */
async function postWithRetry(
  fn: () => Promise<void>,
  platform: string,
): Promise<void> {
  const deadline = Date.now() + RETRY_WINDOW_MS;
  let lastErr = "";
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      await fn();
      if (attempt > 1) {
        console.log(
          `[AutoScheduler] ✅ ${platform} thành công sau ${attempt} lần thử`,
        );
      }
      return;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      const remaining = Math.round((deadline - Date.now()) / 1000);
      console.warn(
        `[AutoScheduler] ⚠️  ${platform} thất bại lần ${attempt} (còn ${remaining}s): ${lastErr}`,
      );
      if (Date.now() + RETRY_INTERVAL_MS < deadline) {
        await sleep(RETRY_INTERVAL_MS);
      } else {
        break;
      }
    }
  }

  throw new Error(`[Retry hết thời gian 3 phút] ${lastErr}`);
}

// ─── Phase 1: Cron 11:50 — Yêu cầu browser soạn AI ──────────

/**
 * Tạo record "waiting_for_ai".
 * Browser sẽ detect và generate content FB → Threads → IG tuần tự,
 * sau đó gọi PUT /api/auto-scheduler để lưu kết quả.
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
    threadsContent: "",
    igCaption: "",
    igImageUrl: undefined,
    facebook: { status: "pending" },
    threads: { status: "pending" },
    instagram: { status: "pending" },
    overallStatus: "waiting_for_ai",
  };
  upsertAutoRecord(record);

  console.log(
    `\n[AutoScheduler] ⏳ [CHUẨN BỊ] Chờ browser soạn AI [${slot}] — ${recordId}`,
  );
  console.log(
    `[AutoScheduler]   11:50 → FB → 11:53 → Threads → 11:55 → IG → content_ready`,
  );
  return record;
}

// ─── Store content (gọi từ PUT endpoint sau khi browser submit) ─

/**
 * Lưu nội dung AI đã soạn vào record.
 * Đánh dấu "content_ready" — sẽ đăng lúc 12:00/18:00.
 * Nếu đã qua giờ đăng → chạy posting ngay lập tức.
 */
export function storeContentForRecord(
  recordId: string,
  fbContent: string,
  threadsContent: string,
  igCaption: string,
  topicLabel = "",
): AutoPostRecord {
  const existing = getAutoRecord(recordId);
  if (!existing) throw new Error(`Record ${recordId} không tìm thấy`);
  if (existing.overallStatus !== "waiting_for_ai") {
    console.warn(
      `[AutoScheduler] Record ${recordId} không ở trạng thái waiting_for_ai (${existing.overallStatus}), bỏ qua`,
    );
    return existing;
  }

  const record: AutoPostRecord = {
    ...existing,
    content: fbContent,
    threadsContent: threadsContent,
    igCaption,
    topicLabel: topicLabel || existing.topicLabel,
    overallStatus: "content_ready",
  };
  upsertAutoRecord(record);

  console.log(
    `[AutoScheduler] ✅ [CONTENT READY] Đã lưu nội dung cho ${recordId} — chờ đến giờ đăng`,
  );

  // Nếu đã qua giờ đăng của slot → chạy ngay (trường hợp browser submit muộn)
  const postTime = getSlotPostTime(record.slot);
  if (Date.now() >= postTime.getTime()) {
    console.log(
      `[AutoScheduler] ⚡ Đã qua giờ đăng [${record.slot}], chạy posting ngay...`,
    );
    executePlatformPosts(recordId).catch((err) => {
      console.error(`[AutoScheduler] executePlatformPosts lỗi:`, err);
    });
  }

  return record;
}

/** Lấy giờ đăng (12:00 hoặc 18:00) hôm nay theo VN timezone */
function getSlotPostTime(slot: AutoPostSlot): Date {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const d = new Date(now);
  const vnBase = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  if (slot === "noon") vnBase.setHours(12, 0, 0, 0);
  else vnBase.setHours(18, 0, 0, 0);
  // Tính offset VN so với UTC để convert về UTC
  const tzOffset = now.getTime() - vnNow.getTime();
  return new Date(vnBase.getTime() + tzOffset);
}

// ─── Phase 2: Cron 12:00 — Đăng lên các nền tảng ─────────────

/**
 * Đọc các record "content_ready" cho slot hiện tại và đăng.
 * Gọi từ cron job lúc 12:00 / 18:00.
 */
export async function executeReadyPosts(slot: AutoPostSlot): Promise<void> {
  const records = getAllAutoRecords().filter(
    (r) => r.slot === slot && r.overallStatus === "content_ready",
  );

  if (records.length === 0) {
    console.log(
      `[AutoScheduler] ℹ️  Không có record content_ready cho slot [${slot}]`,
    );
    return;
  }

  for (const record of records) {
    await executePlatformPosts(record.id);
  }
}

/**
 * PHASE 2 — Đăng lên 3 nền tảng tuần tự với retry.
 * FB (12:00) → chờ đủ 3 phút → Threads (12:03) → chờ đủ 3 phút → IG (12:06)
 * Mỗi nền tảng retry tối đa 3 phút, sau đó đánh failed và tiếp tục.
 */
export async function executePlatformPosts(
  recordId: string,
): Promise<AutoPostRecord> {
  const existing = getAutoRecord(recordId);
  if (!existing) throw new Error(`Record ${recordId} không tìm thấy`);

  // Cho phép cả content_ready (đăng đúng lịch) lẫn waiting_for_ai (backward compat)
  const allowedStatuses = ["content_ready", "waiting_for_ai"];
  if (!allowedStatuses.includes(existing.overallStatus)) {
    console.warn(
      `[AutoScheduler] Record ${recordId} trạng thái ${existing.overallStatus} — bỏ qua`,
    );
    return existing;
  }

  const record = { ...existing };
  record.overallStatus = "running";
  record.facebook = { status: "pending" };
  record.threads = { status: "pending" };
  record.instagram = { status: "pending" };
  upsertAutoRecord(record);

  const fbContent = record.content;
  const threadsContent =
    (record.threadsContent?.trim() ? record.threadsContent : record.content) ??
    record.content;
  const igCaption = record.igCaption;

  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(`[AutoScheduler] 🚀 BẮT ĐẦU ĐĂNG [${record.slot}] — ${recordId}`);
  console.log(
    `[AutoScheduler]   12:00 FB → 12:03 Threads → 12:06 IG (retry 3 phút/platform)`,
  );
  console.log(`[AutoScheduler] ═══════════════════════════════════`);

  // ── [1/3] Facebook — 12:00 ────────────────────────────────────
  const fbStart = Date.now();
  console.log(`\n[AutoScheduler] 📘 [1/3] Đăng lên Facebook (retry 3 phút)...`);
  try {
    await postWithRetry(async () => {
      const fbResult = await facebookService.publishText(fbContent);
      const fbPostId = fbResult.kind !== "video" ? fbResult.postId : undefined;
      const fbPermalink =
        fbResult.kind !== "video"
          ? (fbResult.permalink ?? undefined)
          : undefined;
      const fbPostedAt = new Date().toISOString();

      record.facebook = {
        status: "posted",
        postId: fbPostId,
        permalinkUrl: fbPermalink ?? undefined,
        postedAt: fbPostedAt,
      };
      upsertFBPost({
        id: `auto_fb_${record.id}`,
        message: fbContent,
        mediaType: "TEXT",
        scheduledAt: record.triggeredAt,
        postedAt: fbPostedAt,
        fbPostId: fbPostId ?? undefined,
        fbPermalinkUrl: fbPermalink ?? undefined,
        status: "posted",
        topic: record.topic || undefined,
        topicLabel: record.topicLabel || undefined,
        source: "auto",
      });
      upsertAutoRecord(record);
      console.log(`[AutoScheduler] ✅ Facebook OK — Post ID: ${fbPostId}`);
    }, "Facebook");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record.facebook = { status: "failed", errorMessage: msg };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Facebook thất bại (hết retry): ${msg}`);
  }

  // Chờ đủ 3 phút kể từ khi bắt đầu đăng FB
  const fbElapsed = Date.now() - fbStart;
  const fbWait = Math.max(0, PLATFORM_DELAY_MS - fbElapsed);
  if (fbWait > 0) {
    console.log(
      `[AutoScheduler] ⏳ Chờ thêm ${Math.round(fbWait / 1000)}s → đăng Threads (12:03)...`,
    );
    await sleep(fbWait);
  }

  // ── [2/3] Threads — 12:03 ─────────────────────────────────────
  const thStart = Date.now();
  console.log(`\n[AutoScheduler] 🧵 [2/3] Đăng lên Threads (retry 3 phút)...`);
  try {
    await postWithRetry(async () => {
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
    }, "Threads");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record.threads = { status: "failed", errorMessage: msg };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Threads thất bại (hết retry): ${msg}`);
  }

  // Chờ đủ 3 phút kể từ khi bắt đầu đăng Threads
  const thElapsed = Date.now() - thStart;
  const thWait = Math.max(0, PLATFORM_DELAY_MS - thElapsed);
  if (thWait > 0) {
    console.log(
      `[AutoScheduler] ⏳ Chờ thêm ${Math.round(thWait / 1000)}s → đăng Instagram (12:06)...`,
    );
    await sleep(thWait);
  }

  // ── [3/3] Instagram — 12:06 ───────────────────────────────────
  console.log(
    `\n[AutoScheduler] 📸 [3/3] Đăng lên Instagram (retry 3 phút)...`,
  );
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
    try {
      await postWithRetry(async () => {
        const igResult = await instagramService.publish({
          caption: igCaption,
          mediaType: "IMAGE",
          imageUrl: igImage.url,
        });
        const igPostedAt = new Date().toISOString();
        record.instagram = {
          status: "posted",
          postId: igResult.mediaId,
          permalinkUrl: igResult.permalink ?? undefined,
          postedAt: igPostedAt,
        };
        upsertIGPost({
          id: `auto_ig_${record.id}`,
          caption: igCaption,
          mediaType: "IMAGE",
          imageUrl: igImage.url,
          scheduledAt: record.triggeredAt,
          postedAt: igPostedAt,
          igContainerId: undefined,
          igMediaId: igResult.mediaId,
          igPermalinkUrl: igResult.permalink ?? undefined,
          status: "posted",
          topic: record.topic || undefined,
          topicLabel: record.topicLabel || undefined,
          source: "auto",
        });
        upsertAutoRecord(record);
        console.log(
          `[AutoScheduler] ✅ Instagram OK — Media ID: ${igResult.mediaId}`,
        );
      }, "Instagram");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      record.instagram = { status: "failed", errorMessage: msg };
      upsertAutoRecord(record);
      console.error(
        `[AutoScheduler] ❌ Instagram thất bại (hết retry): ${msg}`,
      );
    }
  }

  // ── Tính overallStatus ────────────────────────────────────────
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

// ─── Backward compat: trigger thủ công ────────────────────────

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
    // Cron 1: 11:50/17:50 — Tạo record waiting_for_ai (browser soạn AI)
    const prepJob = cron.schedule(
      slot.prepCron,
      () => {
        startWaitingForAI(slot.id);
      },
      { timezone: TIMEZONE },
    );
    _schedulerJobs.push(prepJob);
    console.log(
      `[AutoScheduler] ✅ Cron CHUẨN BỊ: ${slot.label} (${slot.prepCron})`,
    );

    // Cron 2: 12:00/18:00 — Đăng lên 3 nền tảng
    const postJob = cron.schedule(
      slot.postCron,
      () => {
        executeReadyPosts(slot.id).catch((err) => {
          console.error(
            `[AutoScheduler] executeReadyPosts [${slot.id}] lỗi:`,
            err,
          );
        });
      },
      { timezone: TIMEZONE },
    );
    _schedulerJobs.push(postJob);
    console.log(
      `[AutoScheduler] ✅ Cron ĐĂNG BÀI: ${slot.label} (${slot.postCron})`,
    );
  }

  console.log(
    `[AutoScheduler] 🟢 Multi-Platform Auto Scheduler đã khởi động (Timezone: ${TIMEZONE})`,
  );
  console.log(`[AutoScheduler]   Chuẩn bị: 11:50 (FB→Threads→IG tuần tự)`);
  console.log(
    `[AutoScheduler]   Đăng: 12:00 FB → 12:03 Threads → 12:06 IG (retry 3 phút/platform)`,
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
    slots: SLOTS.map((s) => ({
      id: s.id,
      label: s.label,
      prepCron: s.prepCron,
      postCron: s.postCron,
    })),
    platformDelayMinutes: PLATFORM_DELAY_MS / 60_000,
    retryWindowMinutes: RETRY_WINDOW_MS / 60_000,
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
