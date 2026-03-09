// ============================================================
// AUTO THREADS — Multi-Platform Auto Scheduler
// ─── Nguồn nội dung: CHỈ lấy từ Content Pool (.xlsx) ───────────
//   06:15/11:15/17:45 → lấy item pending trong day+slot từ pool
//   Nếu có → validate + upload ảnh lên Cloudinary → content_ready
//   Nếu không có nội dung → bỏ qua slot này (không đăng)
//   Nếu không có ảnh hợp lệ → tạo record failed, không đăng
// ─── Lịch ĐĂNG: 06:30, 11:30 và 18:00 ──────────────────────────
//   HH:mm     → Đăng FB      (retry tối đa 5 phút)
//   HH:mm +5  → Đăng Threads (retry tối đa 5 phút)
//   HH:mm +10 → Đăng IG      (retry tối đa 5 phút)
//   (Áp dụng cho cả 3 slot: sáng 06:30, trưa 11:30, tối 18:00)
// ─── Ảnh (BẮT BUỘC cho CẢ 3 nền tảng, không fallback text) ─────
//   T-15min: validate URL → upload lên Cloudinary → lưu secure_url
//   FB / Threads / IG đều dùng cùng Cloudinary URL (Meta luôn chấp nhận)
//   Không có ảnh → tất cả nền tảng bị hủy ngay lập tức
// ─── Cơ chế lỗi ─────────────────────────────────────────────────
//   Mỗi nền tảng có 5 phút retry. Hết thời gian → đánh dấu failed
//   → tiếp tục nền tảng tiếp theo đúng lịch.
// ============================================================
import cron from "node-cron";
import { facebookService, FBApiError } from "@/lib/services/facebook.service";
import {
  threadsService,
  ThreadsApiError,
} from "@/lib/services/threads.service";
import { instagramService, IGApiError } from "@/lib/services/instagram.service";
import {
  getThreadsService,
  getFacebookService,
  getInstagramService,
} from "@/lib/services/service-resolver";
import { getAllAccountsSafe, getAccount } from "@/lib/account-store";
import { getNextIGImage, getIGImagePool } from "@/lib/ig-image-pool";
import {
  getPoolItemForSlot,
  markPoolItemUsed,
  updatePoolItemImageUrl,
} from "@/lib/content-pool";
import {
  isCloudinaryUrl,
  validateImageUrl,
  uploadImageUrlToCloudinary,
} from "./cloudinary-server";
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
const PLATFORM_DELAY_MS = 5 * 60 * 1000; // 5 phút
/** Thời gian retry tối đa cho mỗi nền tảng (ms) */
const RETRY_WINDOW_MS = 5 * 60 * 1000; // 5 phút
/** Interval mỗi lần retry (ms) */
const RETRY_INTERVAL_MS = 30 * 1000; // 30 giây

const SLOTS = [
  {
    id: "morning" as AutoPostSlot,
    label: "Buổi sáng (06:30)",
    /** Chuẩn bị nội dung + upload ảnh Cloudinary: 06:15 (T-15min) */
    prepCron: "15 6 * * *",
    /** Bắt đầu đăng: 06:30 */
    postCron: "30 6 * * *",
  },
  {
    id: "lunch" as AutoPostSlot,
    label: "Buổi trưa (11:00)",
    /** Chuẩn bị nội dung + upload ảnh Cloudinary: 10:45 (T-15min) */
    prepCron: "45 10 * * *",
    /** Bắt đầu đăng: 11:00 */
    postCron: "0 11 * * *",
  },
  {
    id: "evening" as AutoPostSlot,
    label: "Buổi tối (17:00)",
    /** Chuẩn bị nội dung + upload ảnh Cloudinary: 16:45 (T-15min) */
    prepCron: "45 16 * * *",
    /** Bắt đầu đăng: 17:00 */
    postCron: "0 17 * * *",
  },
];

/** Giờ đăng bài (VN) cho mỗi slot — dùng để kiểm tra catch-up */
const SLOT_POST_HOURS: Record<AutoPostSlot, { h: number; m: number }> = {
  morning: { h: 6, m: 30 },
  lunch: { h: 11, m: 0 },
  evening: { h: 17, m: 0 },
};

// ─── Global guard ─────────────────────────────────────────────
const _g = global as typeof global & {
  __autoSchedulerStarted?: boolean;
  __autoSchedulerJobs?: ReturnType<typeof cron.schedule>[];
};

// ─── Sleep ────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Content Formatter ───────────────────────────────────────

/**
 * Xoá các ký tự định dạng Markdown thừa trong nội dung trước khi đăng lên mạng xã hội.
 * Facebook / Threads / Instagram hiển thị **bold** dưới dạng ký tự thô thay vì in đậm.
 *   **text** / __text__  →  text
 *   *text*               →  text  (chỉ khi bao quanh bởi ký tự — không ảnh hưởng bullet `- `)
 */
function stripMarkdown(text: string): string {
  if (!text) return text;
  return (
    text
      // **bold** and __bold__
      .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
      .replace(/__([^_\n]+?)__/g, "$1")
      // *italic* — chỉ khi không phải bullet (không đứng đầu dòng)
      .replace(/(?<!^|\n)\*([^*\n]+?)\*/gm, "$1")
  );
}

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

// ─── Image resolver (gọi ở T-15min) ─────────────────────────

/**
 * Tìm, validate và upload ảnh lên Cloudinary.
 * Thứ tự ưu tiên: preferredUrl → ig-auto-images.json pool.
 *   - URL là Cloudinary → dùng trực tiếp (không re-upload)
 *   - URL accessible + Cloudinary cấu hình → upload → trả về secure_url
 *   - URL accessible + không có Cloudinary → dùng URL gốc (cảnh báo)
 *   - URL không accessible → bỏ qua, thử tiếp
 *   - Hết tất cả → trả về null
 */
async function resolveAndUploadImage(
  preferredUrl: string | null | undefined,
): Promise<string | null> {
  const cloudinaryConfigured = !!(CLOUD_NAME && API_KEY && API_SECRET);
  const { images: poolImages } = getIGImagePool();

  const candidates: string[] = [];
  if (preferredUrl) candidates.push(preferredUrl);
  candidates.push(...poolImages.map((img) => img.url));

  for (const url of candidates) {
    if (!url) continue;

    // Đã có trên Cloudinary → dùng luôn, không upload lại
    if (isCloudinaryUrl(url)) {
      console.log(`[AutoScheduler] ☁️  Dùng Cloudinary URL đã có sẵn.`);
      return url;
    }

    console.log(`[AutoScheduler] 🔍 Kiểm tra URL ảnh: ${url.slice(0, 70)}…`);
    const accessible = await validateImageUrl(url);
    if (!accessible) {
      console.warn(
        `[AutoScheduler] ⚠️  URL không accessible (bị chặn hoặc lỗi): ${url.slice(0, 70)}…`,
      );
      continue;
    }

    if (!cloudinaryConfigured) {
      console.warn(
        `[AutoScheduler] ⚠️  Cloudinary chưa cấu hình — dùng URL trực tiếp (có thể bị Meta chặn): ${url.slice(0, 70)}…`,
      );
      return url;
    }

    try {
      const cloudUrl = await uploadImageUrlToCloudinary(url);
      console.log(
        `[AutoScheduler] ☁️  Upload ảnh thành công → ${cloudUrl.slice(0, 70)}…`,
      );
      return cloudUrl;
    } catch (err) {
      console.warn(
        `[AutoScheduler] ⚠️  Cloudinary upload thất bại (${url.slice(0, 50)}…): ${err}`,
      );
    }
  }

  return null;
}

// Expose env vars for cloudinaryConfigured check inside resolveAndUploadImage
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// ─── Phase 1: Cron 06:15/11:15/17:45 — Chuẩn bị nội dung & ảnh ──

/**
 * Chuẩn bị cho slot: lấy content từ Content Pool, validate + upload ảnh lên Cloudinary.
 * Gọi từ prepCron (06:15 / 10:45 / 16:45) — 15 phút trước giờ đăng.
 * Nếu không có item trong pool → bỏ qua slot này.
 * Nếu không tìm được ảnh hợp lệ → tạo record failed, không đăng bài.
 */
export async function startWaitingForAI(
  slot: AutoPostSlot = "lunch",
  accountId?: string,
): Promise<AutoPostRecord | null> {
  const todayDate = getTodayVNDate();

  // Lấy contentSources từ account config (đăng chéo)
  const acc = accountId ? getAccount(accountId) : undefined;
  const contentSources = acc?.contentSources;

  const poolItem = getPoolItemForSlot(
    todayDate,
    slot,
    accountId,
    contentSources,
  );

  if (!poolItem) {
    const accLabel = accountId ? ` (account: ${accountId})` : "";
    console.log(
      `\n[AutoScheduler] ⏭  [POOL] Không có nội dung cho [${slot}] ngày ${todayDate}${accLabel} — bỏ qua slot này`,
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
  const postLabel =
    slot === "morning" ? "06:30" : slot === "lunch" ? "11:00" : "17:00";

  // ── Phase 0: Validate + upload ảnh lên Cloudinary (T-15min) ─────────
  console.log(
    `[AutoScheduler] 🖼  [PREP] Đang xác thực & upload ảnh cho [${slot}]…`,
  );
  const resolvedImageUrl = await resolveAndUploadImage(poolItem.igImageUrl);

  if (!resolvedImageUrl) {
    const errMsg =
      `Không tìm được ảnh hợp lệ ở T-15min. ` +
      `Thêm igImageUrl vào pool item (Content Pool → Tạo ảnh AI) ` +
      `hoặc bổ sung ảnh Cloudinary/Unsplash vào data/ig-auto-images.json`;
    console.error(`[AutoScheduler] ❌ [PREP] [${slot}] ${errMsg}`);

    // Tạo record thất bại để UI hiển thị cảnh báo
    const failedRecord: AutoPostRecord = {
      id: recordId,
      slot,
      accountId: accountId ?? poolItem.accountId,
      triggeredAt,
      topic: "",
      topicLabel: poolItem.topicLabel,
      content: stripMarkdown(poolItem.fbContent ?? ""),
      threadsContent: stripMarkdown(poolItem.threadsContent ?? ""),
      igCaption: stripMarkdown(poolItem.igCaption ?? ""),
      igImageUrl: undefined,
      facebook: { status: "failed", errorMessage: errMsg },
      threads: { status: "failed", errorMessage: errMsg },
      instagram: { status: "failed", errorMessage: errMsg },
      overallStatus: "failed",
    };
    upsertAutoRecord(failedRecord);
    markPoolItemUsed(poolItem.id, recordId);
    return failedRecord;
  }

  // Ghi Cloudinary URL trở lại pool item để reuse nếu cần
  if (resolvedImageUrl !== poolItem.igImageUrl) {
    updatePoolItemImageUrl(poolItem.id, resolvedImageUrl);
  }

  const record: AutoPostRecord = {
    id: recordId,
    slot,
    accountId: accountId ?? poolItem.accountId,
    triggeredAt,
    topic: "",
    topicLabel: poolItem.topicLabel,
    // Xoá ký tự Markdown (**bold**) trước khi lưu — FB/Threads/IG hiển thị chúng dưới dạng raw text
    content: stripMarkdown(poolItem.fbContent ?? ""),
    threadsContent: stripMarkdown(poolItem.threadsContent ?? ""),
    igCaption: stripMarkdown(poolItem.igCaption ?? ""),
    igImageUrl: resolvedImageUrl,
    facebook: { status: "pending" },
    threads: { status: "pending" },
    instagram: { status: "pending" },
    overallStatus: "content_ready",
  };

  upsertAutoRecord(record);
  markPoolItemUsed(poolItem.id, recordId);

  console.log(
    `\n[AutoScheduler] 📦 [PREP] content_ready [${slot}] — ${poolItem.topicLabel}`,
  );
  console.log(`[AutoScheduler]   FB     : ${poolItem.fbContent.slice(0, 60)}…`);
  console.log(`[AutoScheduler]   Ảnh    : ${resolvedImageUrl.slice(0, 60)}…`);
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
    content: stripMarkdown(fbContent),
    threadsContent: stripMarkdown(threadsContent),
    igCaption: stripMarkdown(igCaption),
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

/** Lấy giờ đăng hôm nay theo VN timezone: 06:30 / 11:00 / 17:00 */
function getSlotPostTime(slot: AutoPostSlot): Date {
  const now = new Date();
  const vnNow = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const vnBase = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  if (slot === "morning") vnBase.setHours(6, 30, 0, 0);
  else if (slot === "lunch") vnBase.setHours(11, 0, 0, 0);
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
 * FB (HH:mm) → chờ đủ 5 phút → Threads (+5min) → chờ đủ 5 phút → IG (+10min)
 * Mỗi nền tảng retry tối đa 5 phút, sau đó đánh failed và tiếp tục.
 * Ảnh BẮT BUỘC — nếu không có ảnh, tất cả nền tảng bị hủy ngay.
 */
export async function executePlatformPosts(
  recordId: string,
  platforms: Array<"facebook" | "threads" | "instagram"> = [
    "facebook",
    "threads",
    "instagram",
  ],
  force = false,
): Promise<AutoPostRecord> {
  const existing = getAutoRecord(recordId);
  if (!existing) throw new Error(`Record ${recordId} không tìm thấy`);

  // Cho phép cả content_ready (đăng đúng lịch) lẫn waiting_for_ai (backward compat)
  const allowedStatuses = force
    ? [
        "content_ready",
        "waiting_for_ai",
        "failed",
        "partial",
        "completed",
        "running",
      ]
    : ["content_ready", "waiting_for_ai"];
  if (!allowedStatuses.includes(existing.overallStatus)) {
    console.warn(
      `[AutoScheduler] Record ${recordId} trạng thái ${existing.overallStatus} — bỏ qua`,
    );
    return existing;
  }

  const record = { ...existing };
  record.overallStatus = "running";
  record.facebook = platforms.includes("facebook")
    ? { status: "pending" }
    : { status: "skipped" };
  record.threads = platforms.includes("threads")
    ? { status: "pending" }
    : { status: "skipped" };
  record.instagram = platforms.includes("instagram")
    ? { status: "pending" }
    : { status: "skipped" };
  upsertAutoRecord(record);

  // ── Guard: BẮT BUỘC phải có ảnh (đã upload Cloudinary ở T-15min) ────
  if (!record.igImageUrl) {
    const msg =
      "Bài đăng thiếu ảnh — giai đoạn chuẩn bị (T-15min) chưa upload ảnh lên Cloudinary. " +
      "Kiểm tra log PREP và bổ sung ảnh vào pool item hoặc ig-auto-images.json.";
    console.error(`[AutoScheduler] ❌ ${msg}`);
    record.overallStatus = "failed";
    record.facebook = { status: "failed", errorMessage: msg };
    record.threads = { status: "failed", errorMessage: msg };
    record.instagram = { status: "failed", errorMessage: msg };
    upsertAutoRecord(record);
    return record;
  }

  const fbContent = record.content;
  const threadsContent =
    (record.threadsContent?.trim() ? record.threadsContent : record.content) ??
    record.content;
  const igCaption = record.igCaption;

  const slotTime =
    record.slot === "morning"
      ? "06:30"
      : record.slot === "lunch"
        ? "11:00"
        : "17:00";
  console.log(`\n[AutoScheduler] ═══════════════════════════════════`);
  console.log(`[AutoScheduler] 🚀 BẮT ĐẦU ĐĂNG [${record.slot}] — ${recordId}`);
  console.log(
    `[AutoScheduler]   ${slotTime} FB → +5min Threads → +10min IG (retry 5 phút/platform)`,
  );
  console.log(`[AutoScheduler] ═══════════════════════════════════`);

  // ── Ảnh chung cho cả 3 nền tảng ─────────────────────────────
  const sharedImageUrl = record.igImageUrl;

  // ── Resolve service instances theo accountId ────────────────
  const fbSvc = getFacebookService(record.accountId);
  const thSvc = getThreadsService(record.accountId);
  const igSvc = getInstagramService(record.accountId);
  const accLabel = record.accountId ? ` [${record.accountId}]` : "";

  // ── [1/3] Facebook — URL-rotation (mirror IG pattern) ──────────
  const fbStart = Date.now();
  console.log(
    `\n[AutoScheduler] 📘 [1/3] Đăng lên Facebook (retry 3 phút, xoay ảnh nếu bị từ chối)...`,
  );
  const fbDeadline = platforms.includes("facebook")
    ? Date.now() + RETRY_WINDOW_MS
    : 0;
  const fbTriedUrls = new Set<string>();
  let fbPosted = !platforms.includes("facebook");
  let fbLastErr = "";
  let fbAttempt = 0;

  while (Date.now() < fbDeadline) {
    const fbImageEntry =
      sharedImageUrl && !fbTriedUrls.has(sharedImageUrl)
        ? { url: sharedImageUrl }
        : getNextIGImage();

    // Pool ảnh trống hoặc đã thử hết → hủy bài (không fallback text)
    if (!fbImageEntry) {
      fbLastErr = "Pool ảnh trống — không thể đăng bài không có ảnh";
      break;
    }
    if (fbTriedUrls.has(fbImageEntry.url)) {
      fbLastErr = "Đã thử hết ảnh trong pool nhưng Meta từ chối tất cả";
      break;
    }

    const fbImageUrl = fbImageEntry.url;
    fbTriedUrls.add(fbImageUrl);
    fbAttempt++;

    try {
      const fbResult = await fbSvc.publishPhoto(fbImageUrl, fbContent);
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
        mediaType: fbImageUrl ? "IMAGE" : "TEXT",
        imageUrl: fbImageUrl ?? undefined,
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
          fbImageUrl
            ? ` (ảnh${fbAttempt > 1 ? ` thứ ${fbAttempt}` : ""})`
            : " (text)"
        }`,
      );
      fbPosted = true;
      break;
    } catch (err) {
      const apiErr = err instanceof FBApiError ? err : null;
      fbLastErr = err instanceof Error ? err.message : String(err);
      const remaining = Math.round((fbDeadline - Date.now()) / 1000);

      // Error 324: URL ảnh bị Meta từ chối → xoay sang ảnh tiếp theo ngay
      if (apiErr?.code === 324 && fbImageUrl) {
        console.warn(
          `[AutoScheduler] ⚠️  FB ảnh bị Meta từ chối (324): ${fbImageUrl.slice(0, 60)}… — thử ảnh tiếp...`,
        );
        continue;
      }

      // Các lỗi khác → chờ rồi retry
      console.warn(
        `[AutoScheduler] ⚠️  Facebook thất bại lần ${fbAttempt} (còn ${remaining}s): ${fbLastErr}`,
      );
      if (Date.now() + RETRY_INTERVAL_MS < fbDeadline) {
        await sleep(RETRY_INTERVAL_MS);
      } else {
        fbLastErr = `[Retry hết thời gian 3 phút] ${fbLastErr}`;
        break;
      }
    }
  }

  if (!fbPosted) {
    record.facebook = { status: "failed", errorMessage: fbLastErr };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Facebook thất bại: ${fbLastErr}`);
  }

  // Chờ đủ 5 phút kể từ khi bắt đầu đăng FB (chỉ khi cả FB lẫn Threads đều được chạy)
  const fbElapsed = Date.now() - fbStart;
  const fbWait =
    platforms.includes("facebook") && platforms.includes("threads")
      ? Math.max(0, PLATFORM_DELAY_MS - fbElapsed)
      : 0;
  if (fbWait > 0) {
    console.log(
      `[AutoScheduler] ⏳ Chờ thêm ${Math.round(fbWait / 1000)}s → đăng Threads (+5min)...`,
    );
    await sleep(fbWait);
  }

  // ── [2/3] Threads — URL-rotation (mirror IG pattern) ───────────
  const thStart = Date.now();
  console.log(
    `\n[AutoScheduler] 🧵 [2/3] Đăng lên Threads (retry 3 phút, xoay ảnh nếu bị từ chối)...`,
  );
  const thDeadline = platforms.includes("threads")
    ? Date.now() + RETRY_WINDOW_MS
    : 0;
  const thTriedUrls = new Set<string>();
  let thPosted = !platforms.includes("threads");
  let thLastErr = "";
  let thAttempt = 0;

  while (Date.now() < thDeadline) {
    const thImageEntry =
      sharedImageUrl && !thTriedUrls.has(sharedImageUrl)
        ? { url: sharedImageUrl }
        : getNextIGImage();

    // Pool ảnh trống hoặc đã thử hết → hủy bài (không fallback text)
    if (!thImageEntry) {
      thLastErr = "Pool ảnh trống — không thể đăng bài không có ảnh";
      break;
    }
    if (thTriedUrls.has(thImageEntry.url)) {
      thLastErr = "Đã thử hết ảnh trong pool nhưng Meta từ chối tất cả";
      break;
    }

    const thImageUrl = thImageEntry.url;
    thTriedUrls.add(thImageUrl);
    thAttempt++;

    try {
      const tResult = await thSvc.publishImagePost(
        thImageUrl,
        threadsContent.slice(0, 500),
      );
      record.threads = {
        status: "posted",
        postId: tResult.postId,
        postedAt: new Date().toISOString(),
      };
      upsertAutoRecord(record);
      console.log(
        `[AutoScheduler] ✅ Threads OK — Post ID: ${tResult.postId}${
          thImageUrl
            ? ` (ảnh${thAttempt > 1 ? ` thứ ${thAttempt}` : ""})`
            : " (text)"
        }`,
      );
      thPosted = true;
      break;
    } catch (err) {
      const apiErr = err instanceof ThreadsApiError ? err : null;
      thLastErr = err instanceof Error ? err.message : String(err);
      const remaining = Math.round((thDeadline - Date.now()) / 1000);

      // Error 1 (unknown) khi đăng bài có ảnh = URL ảnh bị Meta từ chối tại container
      // Error 0 + "Container lỗi" = ảnh bị từ chối trong quá trình xử lý container
      const isImageError =
        thImageUrl &&
        (apiErr?.code === 1 ||
          (apiErr?.code === 0 && thLastErr.includes("Container lỗi")));

      if (isImageError) {
        console.warn(
          `[AutoScheduler] ⚠️  Threads ảnh bị Meta từ chối (${apiErr?.code}): ${thImageUrl!.slice(0, 60)}… — thử ảnh tiếp...`,
        );
        continue;
      }

      // Các lỗi khác → chờ rồi retry
      console.warn(
        `[AutoScheduler] ⚠️  Threads thất bại lần ${thAttempt} (còn ${remaining}s): ${thLastErr}`,
      );
      if (Date.now() + RETRY_INTERVAL_MS < thDeadline) {
        await sleep(RETRY_INTERVAL_MS);
      } else {
        thLastErr = `[Retry hết thời gian 3 phút] ${thLastErr}`;
        break;
      }
    }
  }

  if (!thPosted) {
    record.threads = { status: "failed", errorMessage: thLastErr };
    upsertAutoRecord(record);
    console.error(`[AutoScheduler] ❌ Threads thất bại: ${thLastErr}`);
  }

  // Chờ đủ 5 phút kể từ khi bắt đầu đăng Threads (chỉ khi cả Threads lẫn IG đều được chạy)
  const thElapsed = Date.now() - thStart;
  const thWait =
    platforms.includes("threads") && platforms.includes("instagram")
      ? Math.max(0, PLATFORM_DELAY_MS - thElapsed)
      : 0;
  if (thWait > 0) {
    console.log(
      `[AutoScheduler] ⏳ Chờ thêm ${Math.round(thWait / 1000)}s → đăng Instagram (+10min)...`,
    );
    await sleep(thWait);
  }

  // ── [3/3] Instagram — sau Threads 3 phút ─────────────────────
  console.log(
    `\n[AutoScheduler] 📸 [3/3] Đăng lên Instagram (retry 3 phút)...`,
  );
  const igDeadline = platforms.includes("instagram")
    ? Date.now() + RETRY_WINDOW_MS
    : 0;
  const igTriedUrls = new Set<string>();
  let igPosted = !platforms.includes("instagram");
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
      const igResult = await igSvc.publish({
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
  ].filter((s) => s !== "skipped");
  const allPosted = results.length > 0 && results.every((s) => s === "posted");
  const allFailed =
    results.length === 0 || results.every((s) => s === "failed");

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
  slot: AutoPostSlot = "lunch",
): Promise<AutoPostRecord | null> {
  return startWaitingForAI(slot);
}

/**
 * Chuẩn bị nội dung cho TẤT CẢ accounts có pending content trong slot.
 * Gọi từ cron prep (T-15min).
 */
async function prepAllAccounts(slot: AutoPostSlot): Promise<void> {
  const accounts = getAllAccountsSafe();
  if (accounts.length === 0) {
    // Fallback: chạy như cũ (không có account system)
    await startWaitingForAI(slot);
    return;
  }

  console.log(
    `\n[AutoScheduler] 🔄 [PREP ALL] Chuẩn bị [${slot}] cho ${accounts.length} tài khoản...`,
  );

  for (const acc of accounts) {
    try {
      const record = await startWaitingForAI(slot, acc.id);
      if (record) {
        console.log(
          `[AutoScheduler] ✅ [PREP] Account "${acc.name}" (${acc.id}): ${record.overallStatus}`,
        );
      }
    } catch (err) {
      console.error(
        `[AutoScheduler] ❌ [PREP] Account "${acc.name}" (${acc.id}) lỗi:`,
        err,
      );
    }
  }
}

// ─── Scheduler lifecycle ──────────────────────────────────────

// Lưu trên global để tồn tại qua hot-reload trong dev mode
if (!_g.__autoSchedulerJobs) _g.__autoSchedulerJobs = [];
const _getJobs = () => _g.__autoSchedulerJobs!;
const _setJobs = (jobs: ReturnType<typeof cron.schedule>[]) => {
  _g.__autoSchedulerJobs = jobs;
};

/**
 * Khởi động auto-scheduler.
 * Yêu cầu AUTO_SCHEDULER_ENABLED=true trong .env
 */
export function startAutoScheduler(): void {
  if (_g.__autoSchedulerStarted && _getJobs().length > 0) {
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

  // Dọn cron cũ nếu có (tránh duplicate sau hot-reload)
  _getJobs().forEach((j) => j.stop());
  _setJobs([]);

  _g.__autoSchedulerStarted = true;
  const jobs = _getJobs();

  for (const slot of SLOTS) {
    // Cron 1: T-15min — Lấy nội dung từ Content Pool (cho tất cả accounts)
    const prepJob = cron.schedule(
      slot.prepCron,
      () => {
        prepAllAccounts(slot.id).catch((err) => {
          console.error(`[AutoScheduler] ❌ Chuẩn bị [${slot.id}] lỗi:`, err);
        });
      },
      { timezone: TIMEZONE },
    );
    jobs.push(prepJob);
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
    jobs.push(postJob);
    console.log(
      `[AutoScheduler] ✅ Cron ĐĂNG BÀI: ${slot.label} (${slot.postCron})`,
    );
  }

  console.log(
    `[AutoScheduler] 🟢 Multi-Platform Auto Scheduler đã khởi động (Timezone: ${TIMEZONE})`,
  );
  console.log(`[AutoScheduler]   Nguồn nội dung: Content Pool (.xlsx)`);
  console.log(`[AutoScheduler]   Lịch đăng: 06:30 / 11:00 / 17:00 (VN)`);
  console.log(
    `[AutoScheduler]   Chuẩn bị (T-15min): 06:15 / 10:45 / 16:45 → validate + upload ảnh Cloudinary → content_ready`,
  );
  console.log(
    `[AutoScheduler]   Đăng: HH:mm FB → +5min Threads → +10min IG (retry 5 phút/platform)`,
  );

  // Catch-up: đăng bù các slot đã miss hôm nay (server khởi động muộn)
  // Chạy async, không block việc khởi động
  catchUpMissedSlots().catch((err) => {
    console.error("[AutoScheduler] ❌ Catch-up lỗi:", err);
  });
}

// ─── Catch-up: đăng bù slot đã miss khi server khởi động muộn ──

/**
 * Kiểm tra các slot hôm nay đã qua giờ đăng nhưng chưa có record.
 * Nếu Content Pool có item pending → chạy toàn bộ flow (prep + post) ngay.
 * Các slot được xử lý tuần tự, mỗi slot cách nhau 10s để tránh overload.
 */
async function catchUpMissedSlots(): Promise<void> {
  const todayDate = getTodayVNDate();
  const now = new Date();
  const vnNow = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));

  const allRecords = getAllAutoRecords();

  const missedSlots: AutoPostSlot[] = [];

  for (const slot of SLOTS) {
    const { h, m } = SLOT_POST_HOURS[slot.id];

    // Kiểm tra slot đã qua giờ đăng chưa
    const slotTimeVN = new Date(vnNow);
    slotTimeVN.setHours(h, m, 0, 0);
    if (vnNow < slotTimeVN) continue; // chưa đến giờ → bỏ qua

    // Kiểm tra đã có record cho slot này hôm nay chưa
    const alreadyHasRecord = allRecords.some(
      (r) => r.slot === slot.id && r.triggeredAt.startsWith(todayDate),
    );
    if (alreadyHasRecord) continue; // đã đăng hoặc đã trigger → bỏ qua

    // Kiểm tra Content Pool có item pending cho slot này không (bất kỳ account nào)
    const poolItem = getPoolItemForSlot(todayDate, slot.id);
    if (!poolItem) continue; // không có nội dung → bỏ qua

    missedSlots.push(slot.id);
  }

  if (missedSlots.length === 0) {
    console.log(
      `[AutoScheduler] ✅ Catch-up: không có slot nào bị miss hôm nay (${todayDate})`,
    );
    return;
  }

  console.log(
    `\n[AutoScheduler] 🔄 Catch-up: phát hiện ${missedSlots.length} slot bị miss hôm nay: [${missedSlots.join(", ")}]`,
  );
  console.log(
    `[AutoScheduler]   Server khởi động sau giờ đăng → đăng bù ngay bây giờ...`,
  );

  for (const slotId of missedSlots) {
    console.log(`\n[AutoScheduler] 🔄 Catch-up: đang xử lý [${slotId}]...`);
    try {
      // Multi-account catch-up: prep tất cả accounts
      await prepAllAccounts(slotId);
      await executeReadyPosts(slotId);
      console.log(`[AutoScheduler] ✅ Catch-up [${slotId}] hoàn tất`);
    } catch (err) {
      console.error(`[AutoScheduler] ❌ Catch-up [${slotId}] lỗi:`, err);
    }

    // Chờ 10s giữa các slot để tránh rate limit
    if (missedSlots.indexOf(slotId) < missedSlots.length - 1) {
      await sleep(10_000);
    }
  }

  console.log(
    `[AutoScheduler] 🔄 Catch-up hoàn tất — đã xử lý ${missedSlots.length} slot bị miss`,
  );
}

export function stopAutoScheduler(): void {
  _getJobs().forEach((j) => j.stop());
  _setJobs([]);
  _g.__autoSchedulerStarted = false;
  console.log("[AutoScheduler] 🔴 Đã dừng.");
}

/**
 * Lên lịch chạy một lần hôm nay tại giờ VN chỉ định (không thay đổi cron định kỳ).
 * @param slot         Slot cần chạy
 * @param prepTimeVN   Giờ chuẩn bị, format "HH:MM" (VD: "18:00")
 * @param postTimeVN   Giờ đăng bài, format "HH:MM" (VD: "18:15")
 * @param platforms    Nền tảng cần đăng (mặc định: cả 3)
 */
export function scheduleOnceForToday(
  slot: AutoPostSlot,
  prepTimeVN: string,
  postTimeVN: string,
  platforms?: Array<"facebook" | "threads" | "instagram">,
): { prepAt: Date; postAt: Date } {
  const toTodayVN = (hhMM: string): Date => {
    const [hh, mm] = hhMM.split(":").map(Number);
    const now = new Date();
    const vnNow = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
    const vnBase = new Date(
      now.toLocaleString("en-US", { timeZone: TIMEZONE }),
    );
    vnBase.setHours(hh, mm, 0, 0);
    const tzOffset = now.getTime() - vnNow.getTime();
    return new Date(vnBase.getTime() + tzOffset);
  };

  const prepAt = toTodayVN(prepTimeVN);
  const postAt = toTodayVN(postTimeVN);
  const now = Date.now();
  const prepDelay = Math.max(0, prepAt.getTime() - now);
  const postDelay = Math.max(0, postAt.getTime() - now);

  console.log(
    `[AutoScheduler] 📅 One-time [${slot}]: prep=${prepTimeVN} VN (+${Math.round(prepDelay / 1000)}s), post=${postTimeVN} VN (+${Math.round(postDelay / 1000)}s)`,
  );

  let onceRecordId: string | null = null;

  setTimeout(async () => {
    console.log(`[AutoScheduler] ⏰ One-time PREP [${slot}] bắt đầu…`);
    const rec = await startWaitingForAI(slot).catch((err) => {
      console.error(`[AutoScheduler] One-time prep lỗi:`, err);
      return null;
    });
    if (rec) onceRecordId = rec.id;
  }, prepDelay);

  setTimeout(async () => {
    console.log(`[AutoScheduler] ⏰ One-time POST [${slot}] bắt đầu…`);
    let targetId = onceRecordId;
    if (!targetId) {
      // Fallback: tìm record content_ready mới nhất cho slot hôm nay
      const todayDate = getTodayVNDate();
      const found = getAllAutoRecords().find(
        (r) =>
          r.slot === slot &&
          r.overallStatus === "content_ready" &&
          new Date(r.triggeredAt).toLocaleDateString("en-CA", {
            timeZone: TIMEZONE,
          }) === todayDate,
      );
      if (found) targetId = found.id;
    }
    if (!targetId) {
      console.error(
        `[AutoScheduler] One-time post: không tìm thấy record content_ready cho [${slot}]`,
      );
      return;
    }
    await executePlatformPosts(targetId, platforms).catch((err) => {
      console.error(`[AutoScheduler] One-time post lỗi:`, err);
    });
  }, postDelay);

  return { prepAt, postAt };
}

/**
 * Trigger thủ công (dùng để test trên UI hoặc API).
 * Chạy toàn bộ flow: chuẩn bị (Content Pool + upload ảnh) rồi đăng ngay.
 * Truyền `platforms` để chỉ đăng một số nền tảng (VD: test FB+Threads mà không IG).
 * Trả về null nếu không có content pool item cho slot hôm nay.
 */
export async function triggerAutoPost(
  slot: AutoPostSlot = "lunch",
  platforms?: Array<"facebook" | "threads" | "instagram">,
): Promise<AutoPostRecord | null> {
  const platformsLabel = platforms ? `[${platforms.join(",")}]` : "[all]";
  console.log(
    `[AutoScheduler] 🔧 Trigger thủ công [${slot}] platforms=${platformsLabel}`,
  );
  const record = await startWaitingForAI(slot);
  if (!record || record.overallStatus === "failed") return record;
  return executePlatformPosts(record.id, platforms);
}

/**
 * Lấy trạng thái scheduler để hiển thị trên UI
 */
export function getAutoSchedulerStatus() {
  const records = getAllAutoRecords();
  const lastRecord = records[0] ?? null;

  return {
    enabled: process.env.AUTO_SCHEDULER_ENABLED === "true",
    running: _getJobs().length > 0,
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
