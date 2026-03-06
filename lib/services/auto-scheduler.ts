// ============================================================
// AUTO THREADS — Multi-Platform Auto Scheduler
// ─── Nguồn nội dung: CHỈ lấy từ Content Pool (.xlsx) ───────────
//   06:15/11:15/16:45 → lấy item pending trong day+slot từ pool
//   Nếu có → content_ready (kèm igImageUrl nếu đã tạo thủ công trên UI)
//   Nếu không có → bỏ qua slot này (không đăng)
// ─── Lịch ĐĂNG: 06:30, 11:30 và 17:00 ──────────────────────────
//   HH:mm     → Đăng FB   (retry tối đa 3 phút)
//   HH:mm +3  → Đăng Threads (retry tối đa 3 phút)
//   HH:mm +6  → Đăng IG   (retry tối đa 3 phút)
//   (Áp dụng cho cả 3 slot: sáng 06:30, trưa 11:00, tối 17:00)
// ─── Ảnh (BẮT BUỘC cho CẢ 3 nền tảng) ─────────────────────────
//   Ưu tiên: igImageUrl từ pool item (tạo bằng Puter.js trên UI)
//   FB: publishPhoto | Threads: publishImagePost | IG: IMAGE media
//   Fallback IG: lấy từ ig-auto-images.json nếu igImageUrl trống
// ─── Cơ chế lỗi ─────────────────────────────────────────────────
//   Mỗi nền tảng có 3 phút retry. Hết thời gian → đánh dấu failed
//   → tiếp tục nền tảng tiếp theo đúng lịch.
// ============================================================
import cron from "node-cron";
import { facebookService } from "@/lib/services/facebook.service";
import { threadsService } from "@/lib/services/threads.service";
import { instagramService, IGApiError } from "@/lib/services/instagram.service";
import { getNextIGImage } from "@/lib/ig-image-pool";
import {
  getPoolItemForSlot,
  markPoolItemUsed,
  getPoolItemByRecordId,
} from "@/lib/content-pool";
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
    id: "morning" as AutoPostSlot,
    label: "Buổi sáng (06:30)",
    /** Chuẩn bị nội dung + tạo ảnh AI: 06:15 */
    prepCron: "15 6 * * *",
    /** Bắt đầu đăng: 06:30 */
    postCron: "30 6 * * *",
  },
  {
    id: "noon" as AutoPostSlot,
    label: "Buổi trưa (11:30)",
    /** Chuẩn bị nội dung + tạo ảnh AI: 11:15 (15 phút trước giờ đăng) */
    prepCron: "15 11 * * *",
    /** Bắt đầu đăng: 11:30 */
    postCron: "30 11 * * *",
  },
  {
    id: "evening" as AutoPostSlot,
    label: "Buổi tối (17:00)",
    /** Chuẩn bị nội dung + tạo ảnh AI: 16:45 */
    prepCron: "45 16 * * *",
    /** Bắt đầu đăng: 17:00 */
    postCron: "0 17 * * *",
  },
];

// ─── Global guard ─────────────────────────────────────────────
const _g = global as typeof global & { __autoSchedulerStarted?: boolean };

// ─── Sleep ────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Trả về ngày hôm nay theo VN timezone: "2026-03-05" */
function getTodayVNDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

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

// ─── Phase 1: Cron 06:15/10:45/16:45 — Chuẩn bị nội dung ────────

/**
 * Chuẩn bị nội dung cho slot: lấy từ Content Pool.
 * Gọi từ prepCron (06:15 / 11:15 / 16:45).
 * Nếu không có item trong pool → bỏ qua slot này.
 * Ảnh IG: tạo thủ công trên UI (Content Pool → Tạo ảnh AI) trước giờ đăng.
 */
export async function startWaitingForAI(
  slot: AutoPostSlot = "noon",
): Promise<AutoPostRecord | null> {
  const todayDate = getTodayVNDate();
  const poolItem = getPoolItemForSlot(todayDate, slot);

  if (!poolItem) {
    console.log(
      `\n[AutoScheduler] ⏭  [POOL] Không có nội dung cho [${slot}] ngày ${todayDate} — bỏ qua slot này`,
    );
    return null;
  }

  if (poolItem.date !== todayDate) {
    console.log(
      `\n[AutoScheduler] ⚠️  [POOL] Không có nội dung cho [${slot}] ngày ${todayDate} — dùng fallback: "${poolItem.topicLabel}" (${poolItem.date})`,
    );
  }

  const recordId = generateAutoId();
  const triggeredAt = new Date().toISOString();

  const record: AutoPostRecord = {
    id: recordId,
    slot,
    triggeredAt,
    topic: "",
    topicLabel: poolItem.topicLabel,
    content: poolItem.fbContent,
    threadsContent: poolItem.threadsContent,
    igCaption: poolItem.igCaption,
    igImageUrl: poolItem.igImageUrl,
    facebook: { status: "pending" },
    threads: { status: "pending" },
    instagram: { status: "pending" },
    overallStatus: "content_ready",
  };

  upsertAutoRecord(record);
  markPoolItemUsed(poolItem.id, recordId);

  const postLabel =
    slot === "morning" ? "06:30" : slot === "noon" ? "11:30" : "17:00";

  console.log(
    `\n[AutoScheduler] 📦 [PREP] content_ready [${slot}] — ${poolItem.topicLabel}`,
  );
  console.log(`[AutoScheduler]   FB     : ${poolItem.fbContent.slice(0, 60)}…`);
  console.log(
    `[AutoScheduler]   Ảnh IG : ${
      poolItem.igImageUrl
        ? poolItem.igImageUrl.slice(0, 50) + "…"
        : "chưa có — sẽ fallback sang image pool lúc đăng"
    }`,
  );
  console.log(`[AutoScheduler]   ⏰ Đăng lúc: ${postLabel}`);

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

  // Nếu đã qua giờ đăng của slot → chạy ngay
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

/** Lấy giờ đăng hôm nay theo VN timezone: 06:30 / 11:30 / 17:00 */
function getSlotPostTime(slot: AutoPostSlot): Date {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const vnBase = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  if (slot === "morning") vnBase.setHours(6, 30, 0, 0);
  else if (slot === "noon") vnBase.setHours(11, 30, 0, 0);
  else vnBase.setHours(17, 0, 0, 0);
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

  // ── Last-chance: nếu igImageUrl vẫn trống, thử lấy lại từ pool item ────
  // Xử lý trường hợp browser tạo ảnh sau khi startWaitingForAI đã chạy
  if (!record.igImageUrl) {
    const freshPoolItem = getPoolItemByRecordId(recordId);
    if (freshPoolItem?.igImageUrl) {
      record.igImageUrl = freshPoolItem.igImageUrl;
      console.log(
        `[AutoScheduler] 🖼  Last-chance: lấy igImageUrl từ pool item → ${record.igImageUrl.slice(0, 60)}…`,
      );
      upsertAutoRecord(record);
    }
  }

  const fbContent = record.content;
  const threadsContent =
    (record.threadsContent?.trim() ? record.threadsContent : record.content) ??
    record.content;
  const igCaption = record.igCaption;

  const slotTime =
    record.slot === "morning"
      ? "06:30"
      : record.slot === "noon"
        ? "11:30"
        : "17:00";
  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(`[AutoScheduler] 🚀 BẮT ĐẦU ĐĂNG [${record.slot}] — ${recordId}`);
  console.log(
    `[AutoScheduler]   ${slotTime} FB → +3min Threads → +6min IG (retry 3 phút/platform)`,
  );
  console.log(`[AutoScheduler] ═══════════════════════════════════`);

  // ── Ảnh chung cho cả 3 nền tảng ─────────────────────────────
  const sharedImageUrl = record.igImageUrl;

  // ── [1/3] Facebook — 12:00 ────────────────────────────────────
  const fbStart = Date.now();
  console.log(
    `\n[AutoScheduler] 📘 [1/3] Đăng lên Facebook ${
      sharedImageUrl ? "(ảnh + caption)" : "(text only — chưa có ảnh)"
    } (retry 3 phút)...`,
  );
  try {
    await postWithRetry(async () => {
      const fbResult = sharedImageUrl
        ? await facebookService.publishPhoto(sharedImageUrl, fbContent)
        : await facebookService.publishText(fbContent);
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
        mediaType: sharedImageUrl ? "IMAGE" : "TEXT",
        imageUrl: sharedImageUrl ?? undefined,
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
      console.log(
        `[AutoScheduler] ✅ Facebook OK — Post ID: ${fbPostId}${
          sharedImageUrl ? " (với ảnh)" : ""
        }`,
      );
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
  console.log(
    `\n[AutoScheduler] 🧵 [2/3] Đăng lên Threads ${
      sharedImageUrl ? "(ảnh + caption)" : "(text only — chưa có ảnh)"
    } (retry 3 phút)...`,
  );
  try {
    await postWithRetry(async () => {
      const tResult = sharedImageUrl
        ? await threadsService.publishImagePost(
            sharedImageUrl,
            threadsContent.slice(0, 500),
          )
        : await threadsService.publishTextPost(threadsContent.slice(0, 500));
      record.threads = {
        status: "posted",
        postId: tResult.postId,
        postedAt: new Date().toISOString(),
      };
      upsertAutoRecord(record);
      console.log(
        `[AutoScheduler] ✅ Threads OK — Post ID: ${tResult.postId}${
          sharedImageUrl ? " (với ảnh)" : ""
        }`,
      );
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

  // ── [3/3] Instagram — sau Threads 3 phút ─────────────────────
  console.log(
    `\n[AutoScheduler] 📸 [3/3] Đăng lên Instagram (retry 3 phút)...`,
  );
  const igDeadline = Date.now() + RETRY_WINDOW_MS;
  const igTriedUrls = new Set<string>();
  let igPosted = false;
  let igLastErr = "";
  let igAttempt = 0;

  // Ảnh ưu tiên: ảnh chung đã dùng cho FB/Threads (từ pool item / Puter.js UI)
  const preferredImageUrl = sharedImageUrl;

  while (Date.now() < igDeadline) {
    // Lần đầu thử preferredImageUrl; nếu Meta từ chối (9004) mới fallback sang pool
    const igImage =
      preferredImageUrl && !igTriedUrls.has(preferredImageUrl)
        ? { url: preferredImageUrl }
        : getNextIGImage();

    if (!igImage) {
      igLastErr = "Pool ảnh IG trống. Thêm URL vào data/ig-auto-images.json";
      break;
    }

    // Đã thử hết tất cả ảnh trong pool → dừng tránh vòng lặp vô hạn
    if (igTriedUrls.has(igImage.url)) {
      igLastErr = `Đã thử tất cả ảnh trong pool nhưng Meta từ chối tất cả. Lỗi cuối: ${igLastErr}`;
      break;
    }
    igTriedUrls.add(igImage.url);
    igAttempt++;
    record.igImageUrl = igImage.url;

    try {
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
        `[AutoScheduler] ✅ Instagram OK — Media ID: ${igResult.mediaId}${
          igAttempt > 1 ? ` (ảnh thứ ${igAttempt})` : ""
        }`,
      );
      igPosted = true;
      break;
    } catch (err) {
      const apiErr = err instanceof IGApiError ? err : null;
      igLastErr = err instanceof Error ? err.message : String(err);
      const remaining = Math.round((igDeadline - Date.now()) / 1000);

      // Lỗi 9004: URL ảnh bị Meta từ chối → xoay sang ảnh tiếp theo ngay lập tức
      if (apiErr?.code === 9004) {
        console.warn(
          `[AutoScheduler] ⚠️  IG ảnh bị Meta từ chối (9004): ${igImage.url} — thử ảnh tiếp theo...`,
        );
        continue;
      }

      // Các lỗi khác → chờ rồi retry
      console.warn(
        `[AutoScheduler] ⚠️  Instagram thất bại lần ${igAttempt} (còn ${remaining}s): ${igLastErr}`,
      );
      if (Date.now() + RETRY_INTERVAL_MS < igDeadline) {
        await sleep(RETRY_INTERVAL_MS);
      } else {
        igLastErr = `[Retry hết thời gian 3 phút] ${igLastErr}`;
        break;
      }
    }
  }

  if (!igPosted) {
    record.instagram = { status: "failed", errorMessage: igLastErr };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Instagram thất bại: ${igLastErr}`);
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
): Promise<AutoPostRecord | null> {
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
    // Cron 1: 11:50/17:50 — Lấy nội dung từ Content Pool
    const prepJob = cron.schedule(
      slot.prepCron,
      () => {
        startWaitingForAI(slot.id).catch((err) => {
          console.error(`[AutoScheduler] ❌ Chuẩn bị [${slot.id}] lỗi:`, err);
        });
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
  console.log(
    `[AutoScheduler]   Nguồn nội dung: Content Pool (.xlsx) — AI flow tạm dừng`,
  );
  console.log(
    `[AutoScheduler]   Chuẩn bị: 06:15/10:45/16:45 → lấy pool (ảnh chung cho FB+Threads+IG từ UI hoặc fallback image pool)`,
  );
  console.log(
    `[AutoScheduler]   Đăng: HH:mm FB → +3min Threads → +6min IG (retry 3 phút/platform)`,
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
 * Trả về null nếu không có content pool item cho slot hôm nay.
 */
export async function triggerAutoPost(
  slot: AutoPostSlot = "noon",
): Promise<AutoPostRecord | null> {
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
