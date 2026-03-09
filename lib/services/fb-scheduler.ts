// ============================================================
// AUTO THREADS — Facebook Scheduler
// Chạy nền, kiểm tra mỗi phút để đăng các bài đã hẹn giờ.
// Được khởi động từ instrumentation.ts khi server start.
// ============================================================

import cron from "node-cron";
import { facebookService, type FBPublishResult } from "./facebook.service";
import { getFacebookService } from "@/lib/services/service-resolver";
import {
  getDueFBPosts,
  upsertFBPost,
  generateFBId,
  readFBHistory,
} from "./fb-store";
import { generateContent } from "@/lib/content-generator";
import type { FBScheduledPost, FBMediaType } from "@/types";

const _g = global as typeof global & { __fbSchedulerStarted?: boolean };

/**
 * Khởi động FB scheduler.
 * Mỗi phút một lần: tìm tất cả bài `scheduled` mà scheduledAt <= now → đăng lên Facebook.
 */
export function startFBScheduler(): void {
  if (_g.__fbSchedulerStarted) {
    console.log("[FB Scheduler] ⚠️  Đã chạy rồi, bỏ qua.");
    return;
  }
  _g.__fbSchedulerStarted = true;

  // Chạy mỗi phút: "* * * * *"
  cron.schedule("* * * * *", async () => {
    const duePosts = getDueFBPosts();
    if (duePosts.length === 0) return;

    console.log(
      `[FB Scheduler] 🔔 Tìm thấy ${duePosts.length} bài cần đăng...`,
    );

    for (const post of duePosts) {
      await publishFBPost(post);
    }
  });

  console.log("[FB Scheduler] 🟢 Facebook Scheduler đã khởi động (mỗi phút)");
}

/**
 * Đăng một FBScheduledPost lên Facebook.
 * Cập nhật trạng thái trong store sau khi đăng.
 */
export async function publishFBPost(
  post: FBScheduledPost,
  accountId?: string,
): Promise<void> {
  // Đánh dấu đang xử lý để tránh cron job tiếp theo pick lại
  upsertFBPost({ ...post, status: "pending" });

  console.log(`[FB Scheduler] 🚀 Đăng bài ${post.id} (${post.mediaType})...`);

  try {
    let result: FBPublishResult;
    const fbSvc = accountId ? getFacebookService(accountId) : facebookService;

    if (post.mediaType === "IMAGE" && post.imageUrl) {
      result = await fbSvc.publishPhoto(post.imageUrl, post.message);
    } else {
      result = await fbSvc.publishText(post.message);
    }

    // Extract postId — videos use videoId, text/photo use postId
    const fbPostId = result.kind === "video" ? result.videoId : result.postId;
    const fbPermalinkUrl =
      result.kind !== "video" ? (result.permalink ?? undefined) : undefined;

    upsertFBPost({
      ...post,
      status: "posted",
      postedAt: new Date().toISOString(),
      fbPostId,
      fbPermalinkUrl,
    });

    console.log(`[FB Scheduler] ✅ Đăng thành công — FB Post ID: ${fbPostId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    upsertFBPost({ ...post, status: "failed", errorMessage: msg });
    console.error(`[FB Scheduler] ❌ Đăng thất bại (${post.id}): ${msg}`);
  }
}

/**
 * Tạo và đăng ngay (không hẹn giờ).
 * Dùng khi user nhấn "Đăng ngay" từ UI.
 */
export async function postFBNow(params: {
  message: string;
  mediaType: FBMediaType;
  imageUrl?: string;
  topic?: string;
  topicLabel?: string;
  accountId?: string;
}): Promise<FBScheduledPost> {
  const post: FBScheduledPost = {
    id: generateFBId(),
    message: params.message,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    scheduledAt: new Date().toISOString(),
    status: "pending",
    topic: params.topic,
    topicLabel: params.topicLabel,
    source: "manual",
  };
  upsertFBPost(post);

  await publishFBPost(post, params.accountId);
  // Trả về bản mới nhất từ store
  return (
    readFBHistory().posts.find((p) => p.id === post.id) ?? {
      ...post,
      status: "failed",
    }
  );
}

/**
 * Lên lịch đăng bài cho một thời điểm trong tương lai.
 */
export function scheduleFBPost(params: {
  message: string;
  mediaType: FBMediaType;
  imageUrl?: string;
  scheduledAt: string; // ISO string
  topic?: string;
  topicLabel?: string;
}): FBScheduledPost {
  const post: FBScheduledPost = {
    id: generateFBId(),
    message: params.message,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    scheduledAt: params.scheduledAt,
    status: "scheduled",
    topic: params.topic,
    topicLabel: params.topicLabel,
    source: "manual",
  };
  upsertFBPost(post);
  console.log(
    `[FB Scheduler] 📅 Đã hẹn lịch bài ${post.id} cho ${params.scheduledAt}`,
  );
  return post;
}

/**
 * Tạo nội dung AI rồi đăng / hẹn giờ ngay từ server.
 * Dùng cho tính năng auto-post trong tương lai.
 */
export async function generateAndScheduleFBPost(params: {
  topic?: string;
  keywords?: string[];
  scheduledAt?: string; // nếu không truyền → đăng ngay
  mediaType?: FBMediaType;
  imageUrl?: string;
}): Promise<FBScheduledPost> {
  const generated = await generateContent({
    topic: params.topic,
    keywords: params.keywords,
  });

  const mediaType = params.mediaType ?? "TEXT";
  const scheduledAt = params.scheduledAt ?? new Date().toISOString();
  const isNow =
    !params.scheduledAt || new Date(scheduledAt).getTime() <= Date.now() + 5000;

  if (isNow) {
    return postFBNow({
      message: generated.fullPost,
      mediaType,
      imageUrl: params.imageUrl,
      topic: params.topic,
      topicLabel: generated.topicLabel,
    });
  }

  return scheduleFBPost({
    message: generated.fullPost,
    mediaType,
    imageUrl: params.imageUrl,
    scheduledAt,
    topic: params.topic,
    topicLabel: generated.topicLabel,
  });
}
