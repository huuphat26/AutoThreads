// ============================================================
// AUTO THREADS — Optimized Multi-Platform Auto Scheduler
// ─── Nguồn nội dung: CHỈ lấy từ Content Pool (.xlsx) ───────────
// ─── Quy trình: 19:30 (Chuẩn bị) → 20:00 (Đăng bài) ──────────────
// ============================================================

import cron from "node-cron";
import {
  getThreadsService,
  getFacebookService,
  getInstagramService,
} from "@/lib/services/service-resolver";
import { getAllAccountsSafe, getAccount } from "@/lib/account-store";
import { getIGImagePool } from "@/lib/ig-image-pool";
import {
  getPoolItemForSlot,
  markPoolItemUsed,
  updatePoolItemImageUrl,
  getPoolItemByRecordId,
} from "@/lib/content-pool";
import { telegramService } from "./telegram.service";
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
import type { AutoPostRecord, AutoPostSlot } from "@/types";

// ─── Constants ────────────────────────────────────────────────
const TIMEZONE = process.env.TIMEZONE || "Asia/Ho_Chi_Minh";
const PLATFORM_DELAY_MS = 2 * 60 * 1000; // 2 phút theo yêu cầu tối ưu
const RETRY_WINDOW_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 30 * 1000;

const SLOTS = [
  {
    id: "evening" as AutoPostSlot,
    label: "Buổi tối (20:00)",
    prepCron: "30 19 * * *", // Bắt đầu lúc 19:30
    postCron: "0 20 * * *", // Đăng lúc 20:00
  },
];

const SLOT_POST_HOURS: Record<AutoPostSlot, { h: number; m: number }> = {
  evening: { h: 20, m: 0 },
};

// ─── Global State ─────────────────────────────────────────────
const _g = global as typeof global & {
  __autoSchedulerStarted?: boolean;
  __autoSchedulerJobs?: ReturnType<typeof cron.schedule>[];
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Helpers ──────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/__([^_\n]+?)__/g, "$1")
    .replace(/(?<!^|\n)\*([^*\n]+?)\*/gm, "$1");
}

export function getTodayVNDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/**
 * Thực hiện đăng bài với cơ chế retry
 */
async function postWithRetry<T>(
  fn: () => Promise<T>,
  platform: string,
): Promise<T> {
  const deadline = Date.now() + RETRY_WINDOW_MS;
  let lastErr = "";
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.warn(
        `[AutoScheduler] ⚠️ ${platform} lỗi lần ${attempt}: ${lastErr}`,
      );
      if (Date.now() + RETRY_INTERVAL_MS < deadline)
        await sleep(RETRY_INTERVAL_MS);
      else break;
    }
  }
  throw new Error(`[Retry ${platform} failed] ${lastErr}`);
}

/**
 * Xử lý ảnh: Ưu tiên ảnh có sẵn -> Fallback từ pool
 */
async function resolveAndUploadImage(
  preferredUrl?: string,
): Promise<string | null> {
  const candidates: { url?: string }[] = [];

  if (preferredUrl && preferredUrl !== "None") {
    candidates.push({ url: preferredUrl });
  }

  // Fallback từ pool ảnh có sẵn
  const { images: poolImages } = getIGImagePool();
  poolImages.forEach((img) => candidates.push({ url: img.url }));

  for (const item of candidates) {
    if (!item.url || item.url === "None") continue;

    if (isCloudinaryUrl(item.url)) return item.url;

    if (await validateImageUrl(item.url)) {
      try {
        const cloudUrl = await uploadImageUrlToCloudinary(item.url);
        console.log(
          `[AutoScheduler] ☁️ Đã upload lên Cloudinary: ${cloudUrl.slice(0, 50)}...`,
        );
        return cloudUrl;
      } catch (err) {
        console.warn(`[AutoScheduler] ⚠️ Lỗi upload Cloudinary:`, err);
      }
    }
  }
  return null;
}

// ─── Phase 1: 19:30 — Chuẩn bị (Bóc nội dung & Tạo ảnh) ───────

export async function startContentPrep(
  slot: AutoPostSlot = "evening",
  accountId?: string,
): Promise<AutoPostRecord | null> {
  const todayDate = getTodayVNDate();
  const acc = accountId ? getAccount(accountId) : undefined;
  const poolItem = getPoolItemForSlot(
    todayDate,
    slot,
    accountId,
    acc?.contentSources,
  );

  if (!poolItem) {
    console.log(
      `[AutoScheduler] ⏭ Không có nội dung trong Pool cho [${slot}]. Dừng.`,
    );
    return null;
  }

  const recordId = generateAutoId();
  const triggeredAt = new Date().toISOString();

  // 1. Lưu record ở trạng thái chờ trước khi xử lý ảnh
  const initialRecord: AutoPostRecord = {
    id: recordId,
    slot,
    accountId: accountId ?? poolItem.accountId,
    triggeredAt,
    topic: "",
    topicLabel: poolItem.topicLabel,
    content: stripMarkdown(poolItem.fbContent || ""),
    threadsContent: stripMarkdown(
      poolItem.threadsContent || poolItem.fbContent || "",
    ),
    igCaption: stripMarkdown(poolItem.igCaption || poolItem.fbContent || ""),
    facebook: { status: "pending" },
    threads: { status: "pending" },
    instagram: { status: "pending" },
    overallStatus: "running", // Bỏ qua trạng thái waiting_for_ai
    statusMessage: "Đang xử lý hình ảnh...",
  };
  upsertAutoRecord(initialRecord);

  // 2. Xử lý ảnh (không dùng prompt AI)
  console.log(`[AutoScheduler] 🖼 [PREP] Đang xử lý ảnh cho [${slot}]...`);
  const resolvedImageUrl = await resolveAndUploadImage(poolItem.igImageUrl);

  if (!resolvedImageUrl) {
    console.error(`[AutoScheduler] ❌ Không tìm được ảnh hợp lệ cho [${slot}]`);
    const failedRecord: AutoPostRecord = {
      ...initialRecord,
      facebook: { status: "failed", errorMessage: "Không có ảnh (MANDATORY)" },
      threads: { status: "failed", errorMessage: "Không có ảnh (MANDATORY)" },
      instagram: { status: "failed", errorMessage: "Không có ảnh (MANDATORY)" },
      overallStatus: "failed",
      statusMessage: "Lỗi: Không có ảnh (Bắt buộc cho cả 3 nền tảng)",
    };
    upsertAutoRecord(failedRecord);
    
    return failedRecord;
  }

  // Cập nhật lại pool nếu bóc được ảnh từ image pool hoặc upload mới
  if (resolvedImageUrl !== poolItem.igImageUrl)
    updatePoolItemImageUrl(poolItem.id, resolvedImageUrl);

  const finalRecord: AutoPostRecord = {
    ...initialRecord,
    igImageUrl: resolvedImageUrl,
    overallStatus: "content_ready",
    statusMessage: undefined,
  };

  upsertAutoRecord(finalRecord);
  markPoolItemUsed(poolItem.id, recordId);

  console.log(`[AutoScheduler] ✅ [PREP] Hoàn tất chuẩn bị nội dung cho [${slot}].`);

  return finalRecord;
}

// ─── Phase 2: 20:00 — Đăng bài tuần tự ────────────────────────

export async function executeReadyPosts(slot: AutoPostSlot): Promise<void> {
  const records = getAllAutoRecords().filter(
    (r) => r.slot === slot && r.overallStatus === "content_ready",
  );
  for (const record of records) {
    await executePlatformPosts(record.id);
  }
}

export async function executePlatformPosts(
  recordId: string,
  platforms: ("facebook" | "threads" | "instagram")[] = [
    "facebook",
    "threads",
    "instagram",
  ],
  force = false,
): Promise<AutoPostRecord> {
  const record = getAutoRecord(recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  if (!force && record.overallStatus !== "content_ready") return record;

  record.overallStatus = "running";

  if (!record.igImageUrl) {
    record.overallStatus = "failed";
    record.statusMessage = "Lỗi: Bài đăng bắt buộc phải có hình ảnh.";
    upsertAutoRecord(record);
    return record;
  }

  upsertAutoRecord(record);

  const fbSvc = getFacebookService(record.accountId);
  const thSvc = getThreadsService(record.accountId);
  const igSvc = getInstagramService(record.accountId);

  const steps = [
    {
      key: "facebook" as const,
      label: "Facebook",
      fn: async () => {
        const res = await fbSvc.publishPhoto(
          record.igImageUrl!,
          record.content,
        );
        const id = res.kind === "video" ? res.videoId : res.postId;
        return { id, permalink: res.permalink };
      },
    },
    {
      key: "threads" as const,
      label: "Threads",
      fn: async () => {
        const res = await thSvc.publishImagePost(
          record.igImageUrl!,
          record.threadsContent!,
        );
        return { id: res.postId, permalink: "" }; // Threads service current result doesn't have permalink in PublishFlow
      },
    },
    {
      key: "instagram" as const,
      label: "Instagram",
      fn: async () => {
        const res = await igSvc.publish({
          imageUrl: record.igImageUrl!,
          caption: record.igCaption!,
          mediaType: "IMAGE",
        });
        return { id: res.mediaId, permalink: res.permalink };
      },
    },
  ].filter((s) => platforms.includes(s.key));

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(
      `[AutoScheduler] 🚀 [${i + 1}/${steps.length}] Đang đăng lên ${step.label}...`,
    );

    try {
      record.statusMessage = `Đang đăng ${step.label}...`;
      upsertAutoRecord(record);

      const result = await postWithRetry(step.fn, step.label);
      record[step.key] = {
        status: "posted",
        postId: result.id,
        permalinkUrl: result.permalink || undefined,
        postedAt: new Date().toISOString(),
      };
      telegramService
        .notifySuccess(
          step.label,
          result.permalink || undefined,
          record.igImageUrl,
        )
        .catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      record[step.key] = { status: "failed", errorMessage: msg };
      telegramService
        .notifyError(step.label, msg, record.igImageUrl)
        .catch(() => {});
    }

    upsertAutoRecord(record);

    // Chờ 3 phút trước khi đăng nền tảng tiếp theo
    if (i < steps.length - 1) {
      record.statusMessage = `Đã xong ${step.label}, chờ ${PLATFORM_DELAY_MS / 60000} phút...`;
      upsertAutoRecord(record);
      console.log(
        `[AutoScheduler] ⏳ Chờ ${PLATFORM_DELAY_MS / 60000} phút cho nền tảng tiếp theo...`,
      );
      await sleep(PLATFORM_DELAY_MS);
    }
  }

  record.statusMessage = undefined;

  const results = [
    record.facebook.status,
    record.threads.status,
    record.instagram.status,
  ].filter((s) => s !== "skipped");
  record.overallStatus = results.every((s) => s === "posted")
    ? "completed"
    : results.every((s) => s === "failed")
      ? "failed"
      : "partial";
  upsertAutoRecord(record);

  return record;
}

// ─── Lifecycle & Control ──────────────────────────────────────

export function startAutoScheduler(): void {
  if (_g.__autoSchedulerStarted) return;
  if (process.env.AUTO_SCHEDULER_ENABLED !== "true") return;

  _g.__autoSchedulerStarted = true;
  _g.__autoSchedulerJobs = _g.__autoSchedulerJobs || [];
  _g.__autoSchedulerJobs.forEach((j) => j.stop());
  _g.__autoSchedulerJobs = [];

  for (const slot of SLOTS) {
    _g.__autoSchedulerJobs.push(
      cron.schedule(
        slot.prepCron,
        () => {
          prepAllAccounts(slot.id).catch((e) =>
            console.error(`[Prep Error] ${slot.id}:`, e),
          );
        },
        { timezone: TIMEZONE },
      ),
    );

    _g.__autoSchedulerJobs.push(
      cron.schedule(
        slot.postCron,
        () => {
          executeReadyPosts(slot.id).catch((e) =>
            console.error(`[Post Error] ${slot.id}:`, e),
          );
        },
        { timezone: TIMEZONE },
      ),
    );
  }

  console.log(
    `[AutoScheduler] 🟢 Khởi động thành công (Prep: 19:30, Post: 20:00, Delay: 2m)`,
  );
  catchUpMissedSlots().catch((e) => console.error("[Catch-up Error]:", e));
}

async function prepAllAccounts(slot: AutoPostSlot): Promise<void> {
  const accounts = getAllAccountsSafe();
  if (accounts.length === 0) {
    await startContentPrep(slot);
    return;
  }
  for (const acc of accounts) await startContentPrep(slot, acc.id);
}

export function stopAutoScheduler(): void {
  (_g.__autoSchedulerJobs || []).forEach((j) => j.stop());
  _g.__autoSchedulerJobs = [];
  _g.__autoSchedulerStarted = false;
  console.log("[AutoScheduler] 🔴 Dừng.");
}

async function catchUpMissedSlots(): Promise<void> {
  const now = new Date();
  const vnFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = vnFormatter.formatToParts(now);
  const getP = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value || "0");
  const [vnH, vnM] = [getP("hour"), getP("minute")];
  const today = `${getP("year")}-${String(getP("month")).padStart(2, "0")}-${String(getP("day")).padStart(2, "0")}`;

  for (const slot of SLOTS) {
    const { h, m } = SLOT_POST_HOURS[slot.id];
    if (vnH < h || (vnH === h && vnM < m)) continue;
    if ((vnH - h) * 60 + (vnM - m) > 240) continue;

    const records = getAllAutoRecords();
    const hasToday = records.some(
      (r) =>
        r.slot === slot.id &&
        new Date(r.triggeredAt).toLocaleDateString("en-CA", {
          timeZone: TIMEZONE,
        }) === today,
    );
    if (hasToday) continue;

    const poolItem = getPoolItemForSlot(
      today,
      slot.id,
      undefined,
      undefined,
      true,
    );
    if (!poolItem) continue;

    console.log(`[AutoScheduler] 🔄 Catch-up [${slot.id}]...`);
    await prepAllAccounts(slot.id);
    await executeReadyPosts(slot.id);
  }
}

export function getAutoSchedulerStatus() {
  const records = getAllAutoRecords();
  return {
    enabled: process.env.AUTO_SCHEDULER_ENABLED === "true",
    running: !!_g.__autoSchedulerStarted,
    timezone: TIMEZONE,
    slots: SLOTS,
    platformDelayMinutes: PLATFORM_DELAY_MS / 60000,
    totalRuns: records.length,
    lastRun: records[0] || null,
  };
}

export async function triggerAutoPost(
  slot: AutoPostSlot = "evening",
  platforms?: ("facebook" | "threads" | "instagram")[],
) {
  const record = await startContentPrep(slot);
  if (!record || record.overallStatus === "failed") return record;

  if (record.overallStatus === "content_ready") {
    return executePlatformPosts(record.id, platforms, true);
  }

  return record;
}

export function storeContentForRecord(
  recordId: string,
  fb: string,
  th: string,
  ig: string,
  topic = "",
  img?: string,
) {
  const existing = getAutoRecord(recordId);
  if (!existing) throw new Error("Record not found");
  const record = {
    ...existing,
    content: stripMarkdown(fb),
    threadsContent: stripMarkdown(th),
    igCaption: stripMarkdown(ig),
    topicLabel: topic || existing.topicLabel,
    igImageUrl: img || existing.igImageUrl,
    overallStatus: "content_ready" as const,
  };
  upsertAutoRecord(record);
  return record;
}

export function scheduleOnceForToday(
  slot: AutoPostSlot,
  prepTime: string,
  postTime: string,
) {
  const parse = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    const vn = new Date(d.toLocaleString("en-US", { timeZone: TIMEZONE }));
    vn.setHours(h, m, 0, 0);
    return new Date(
      vn.getTime() +
        (d.getTime() -
          new Date(
            d.toLocaleString("en-US", { timeZone: TIMEZONE }),
          ).getTime()),
    );
  };
  const prepAt = parse(prepTime);
  const postAt = parse(postTime);
  setTimeout(
    () => startContentPrep(slot),
    Math.max(0, prepAt.getTime() - Date.now()),
  );
  setTimeout(
    () => executeReadyPosts(slot),
    Math.max(0, postAt.getTime() - Date.now()),
  );
  return { prepAt, postAt };
}

export async function hotfixRecordImage(
  recordId: string,
  newImageUrl: string,
): Promise<{ cloudinaryUrl: string }> {
  const record = getAutoRecord(recordId);
  if (!record) throw new Error("Không tìm thấy record.");

  // Chỉ cho phép hotfix khi chưa đăng xong hoặc bị lỗi
  const allowHotfix = ["content_ready", "failed", "partial"].includes(
    record.overallStatus,
  );
  if (!allowHotfix) {
    throw new Error(`Không thể thay đổi ảnh khi trạng thái là ${record.overallStatus}`);
  }

  console.log(`[AutoScheduler] 🛠 Hotfixing image for record ${recordId}...`);

  // 1. Validate URL mới
  const isValid = await validateImageUrl(newImageUrl);
  if (!isValid) {
    throw new Error("URL hình ảnh không hợp lệ hoặc không thể truy cập.");
  }

  // 2. Upload Cloudinary
  let finalUrl = newImageUrl;
  if (!isCloudinaryUrl(newImageUrl)) {
    try {
      finalUrl = await uploadImageUrlToCloudinary(newImageUrl);
      console.log(`[AutoScheduler] ☁️ Hotfix upload thành công: ${finalUrl}`);
    } catch (err) {
      console.error("[AutoScheduler] Hotfix Cloudinary error:", err);
      throw new Error("Lỗi khi upload ảnh lên Cloudinary.");
    }
  }

  // 3. Cập nhật record
  record.igImageUrl = finalUrl;
  // Nếu đang failed/partial vì thiếu ảnh, có thể chuyển về content_ready
  if (record.overallStatus === "failed" || record.overallStatus === "partial") {
    // Nếu là failed do "Không có ảnh", chuyển về content_ready để cron có thể chạy lại
    // hoặc người dùng nhấn Đăng lại
    record.statusMessage = "Đã cập nhật ảnh hotfix. Sẵn sàng đăng lại.";
  }
  upsertAutoRecord(record);

  // 4. Cập nhật Content Pool (nếu có link)
  const poolItem = getPoolItemByRecordId(recordId);
  if (poolItem) {
    updatePoolItemImageUrl(poolItem.id, finalUrl);
  }

  // 5. Thông báo Telegram
  telegramService
    .sendPreview({
      text: `🛠 <b>Hotfix Ảnh [${record.slot}]</b>\n\n<b>Record:</b> <code>${recordId}</code>\n<b>Chủ đề:</b> ${record.topicLabel}\n\n<i>Ảnh đã được thay đổi thủ công.</i>`,
      photoUrl: finalUrl,
    })
    .catch((e) => console.error("Telegram error:", e));

  return { cloudinaryUrl: finalUrl };
}
