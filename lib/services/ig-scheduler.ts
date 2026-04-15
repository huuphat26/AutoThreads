// ============================================================
// AUTO THREADS — Instagram Scheduler
// Chạy nền, kiểm tra mỗi phút để đăng các bài đã hẹn giờ.
//
// Flow publish IG (khác Facebook):
//   1. POST /{user_id}/media → tạo container → container ID
//   2. Poll /{container_id}?fields=status_code → chờ FINISHED
//   3. POST /{user_id}/media_publish?creation_id=... → media ID
//
// Docs: https://developers.facebook.com/docs/instagram-platform
// ============================================================

import cron from "node-cron";
import { instagramService, IGApiError } from "./instagram.service";
import { getInstagramService } from "@/lib/services/service-resolver";
import {
  getDueIGPosts,
  upsertIGPost,
  generateIGId,
  readIGHistory,
} from "./ig-store";
import { generateContent } from "@/lib/content-generator";
import type { IGScheduledPost, IGScheduleMediaType } from "@/types";

const _g = global as typeof global & { __igSchedulerStarted?: boolean };

/**
 * Khởi động IG scheduler.
 * Mỗi phút kiểm tra bài `scheduled` mà scheduledAt <= now → publish.
 */
export function startIGScheduler(): void {
  if (_g.__igSchedulerStarted) {
    console.log("[IG Scheduler] ⚠️  Đã chạy rồi, bỏ qua.");
    return;
  }
  _g.__igSchedulerStarted = true;

  cron.schedule("* * * * *", async () => {
    const duePosts = getDueIGPosts();
    if (duePosts.length === 0) return;

    console.log(
      `[IG Scheduler] 🔔 Tìm thấy ${duePosts.length} bài Instagram cần đăng...`,
    );

    for (const post of duePosts) {
      await publishIGPost(post);
    }
  });

  console.log("[IG Scheduler] 🟢 Instagram Scheduler đã khởi động (mỗi phút)");
}

/**
 * Publish một IGScheduledPost lên Instagram.
 * Cập nhật trạng thái trong store sau mỗi bước.
 */
export async function publishIGPost(
  post: IGScheduledPost,
  accountId?: string,
): Promise<void> {
  // Đánh dấu pending để tránh cron job tiếp theo pick lại
  upsertIGPost({ ...post, status: "pending" });

  console.log(
    `[IG Scheduler] 🚀 Đăng bài IG ${post.id} (${post.mediaType})...`,
  );

  const igSvc = accountId ? getInstagramService(accountId) : instagramService;

  try {
    const result = await igSvc.publish({
      caption: post.caption || undefined,
      mediaType: post.mediaType,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      shareToFeed: post.shareToFeed,
    });

    upsertIGPost({
      ...post,
      status: "posted",
      postedAt: new Date().toISOString(),
      igContainerId: result.containerId,
      igMediaId: result.mediaId,
      igPermalinkUrl: result.permalink ?? undefined,
    });

    console.log(
      `[IG Scheduler] ✅ Đăng IG thành công — Media ID: ${result.mediaId}`,
    );
  } catch (err) {
    let msg: string;
    if (err instanceof IGApiError) {
      msg = `[Meta ${err.code}${err.subcode ? `/${err.subcode}` : ""}] ${err.message}`;
      console.error(
        `[IG Scheduler] ❌ Đăng IG thất bại (${post.id}): ${msg}`,
        err.raw ? JSON.stringify(err.raw) : "",
      );
    } else {
      msg = err instanceof Error ? err.message : String(err);
      console.error(`[IG Scheduler] ❌ Đăng IG thất bại (${post.id}): ${msg}`);
    }
    upsertIGPost({ ...post, status: "failed", errorMessage: msg });
  }
}

/**
 * Tạo và đăng ngay lên Instagram (không hẹn giờ).
 */
export async function postIGNow(params: {
  caption: string;
  mediaType: IGScheduleMediaType;
  imageUrl?: string;
  videoUrl?: string;
  shareToFeed?: boolean;
  topic?: string;
  topicLabel?: string;
  accountId?: string;
}): Promise<IGScheduledPost> {
  const post: IGScheduledPost = {
    id: generateIGId(),
    caption: params.caption,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    videoUrl: params.videoUrl,
    shareToFeed: params.shareToFeed,
    scheduledAt: new Date().toISOString(),
    status: "pending",
    topic: params.topic,
    topicLabel: params.topicLabel,
    source: "manual",
  };
  upsertIGPost(post);

  await publishIGPost(post, params.accountId);
  return (
    readIGHistory().posts.find((p) => p.id === post.id) ?? {
      ...post,
      status: "failed",
    }
  );
}

/**
 * Lên lịch đăng bài Instagram cho một thời điểm trong tương lai.
 */
export function scheduleIGPost(params: {
  caption: string;
  mediaType: IGScheduleMediaType;
  imageUrl?: string;
  videoUrl?: string;
  shareToFeed?: boolean;
  scheduledAt: string;
  topic?: string;
  topicLabel?: string;
}): IGScheduledPost {
  const post: IGScheduledPost = {
    id: generateIGId(),
    caption: params.caption,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    videoUrl: params.videoUrl,
    shareToFeed: params.shareToFeed,
    scheduledAt: params.scheduledAt,
    status: "scheduled",
    topic: params.topic,
    topicLabel: params.topicLabel,
    source: "manual",
  };
  upsertIGPost(post);
  console.log(
    `[IG Scheduler] 📅 Đã hẹn lịch bài IG ${post.id} cho ${params.scheduledAt}`,
  );
  return post;
}

/**
 * Tạo nội dung AI rồi đăng / hẹn giờ ngay từ server.
 */
export async function generateAndScheduleIGPost(params: {
  topic?: string;
  keywords?: string[];
  scheduledAt?: string;
  mediaType?: IGScheduleMediaType;
  imageUrl?: string;
  videoUrl?: string;
  shareToFeed?: boolean;
}): Promise<IGScheduledPost> {
  const generated = await generateContent({
    topic: params.topic,
    keywords: params.keywords,
  });

  const mediaType = params.mediaType ?? "IMAGE";
  const scheduledAt = params.scheduledAt ?? new Date().toISOString();
  const isNow =
    !params.scheduledAt || new Date(scheduledAt).getTime() <= Date.now() + 5000;

  if (isNow) {
    return postIGNow({
      caption: generated.fullPost,
      mediaType,
      imageUrl: params.imageUrl,
      videoUrl: params.videoUrl,
      shareToFeed: params.shareToFeed,
      topic: params.topic,
      topicLabel: generated.topicLabel,
    });
  }

  return scheduleIGPost({
    caption: generated.fullPost,
    mediaType,
    imageUrl: params.imageUrl,
    videoUrl: params.videoUrl,
    shareToFeed: params.shareToFeed,
    scheduledAt,
    topic: params.topic,
    topicLabel: generated.topicLabel,
  });
}
