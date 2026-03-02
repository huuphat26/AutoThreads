// ============================================================
// AUTO THREADS — Threads Manual Scheduler
// Chạy nền, kiểm tra mỗi phút để đăng các bài Threads đã hẹn giờ thủ công.
// Tách biệt với scheduler.ts (auto-scheduler slot-based).
// Được khởi động từ instrumentation.ts khi server start.
// ============================================================

import cron from "node-cron";
import { threadsService } from "./threads.service";
import {
  getDueThreadsManualPosts,
  upsertThreadsManualPost,
  generateThreadsManualId,
  readThreadsManualHistory,
} from "./threads-manual-store";
import type { ThreadsManualPost, ThreadsManualMediaType } from "@/types";

const _g = global as typeof global & {
  __threadsManualSchedulerStarted?: boolean;
};

/**
 * Khởi động Threads Manual Scheduler.
 * Mỗi phút một lần: tìm tất cả bài `scheduled` mà scheduledAt <= now → đăng lên Threads.
 */
export function startThreadsManualScheduler(): void {
  if (_g.__threadsManualSchedulerStarted) {
    console.log("[Threads Manual Scheduler] ⚠️  Đã chạy rồi, bỏ qua.");
    return;
  }
  _g.__threadsManualSchedulerStarted = true;

  // Chạy mỗi phút: "* * * * *"
  cron.schedule("* * * * *", async () => {
    const duePosts = getDueThreadsManualPosts();
    if (duePosts.length === 0) return;

    console.log(
      `[Threads Manual Scheduler] 🔔 Tìm thấy ${duePosts.length} bài cần đăng...`,
    );

    for (const post of duePosts) {
      await publishThreadsManualPost(post);
    }
  });

  console.log(
    "[Threads Manual Scheduler] 🟢 Threads Manual Scheduler đã khởi động (mỗi phút)",
  );
}

/**
 * Đăng một ThreadsManualPost lên Threads API.
 * Cập nhật trạng thái trong store sau khi đăng.
 */
export async function publishThreadsManualPost(
  post: ThreadsManualPost,
): Promise<void> {
  // Đánh dấu đang xử lý để tránh cron job tiếp theo pick lại
  upsertThreadsManualPost({ ...post, status: "pending" });

  console.log(
    `[Threads Manual Scheduler] 🚀 Đăng bài ${post.id} (${post.mediaType})...`,
  );

  try {
    let result: { postId: string; postedAt: string };

    if (post.mediaType === "IMAGE" && post.imageUrl) {
      result = await threadsService.publishImagePost(
        post.imageUrl,
        post.content || undefined,
      );
    } else {
      result = await threadsService.publishTextPost(post.content);
    }

    upsertThreadsManualPost({
      ...post,
      status: "posted",
      postedAt: result.postedAt,
      threadsPostId: result.postId,
    });

    console.log(
      `[Threads Manual Scheduler] ✅ Đăng thành công — Threads Post ID: ${result.postId}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    upsertThreadsManualPost({ ...post, status: "failed", errorMessage: msg });
    console.error(
      `[Threads Manual Scheduler] ❌ Đăng thất bại (${post.id}): ${msg}`,
    );
  }
}

/**
 * Tạo và đăng ngay (không hẹn giờ).
 * Dùng khi user nhấn "Đăng ngay" từ UI.
 */
export async function postThreadsManualNow(params: {
  content: string;
  mediaType: ThreadsManualMediaType;
  imageUrl?: string;
}): Promise<ThreadsManualPost> {
  const post: ThreadsManualPost = {
    id: generateThreadsManualId(),
    content: params.content,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    scheduledAt: new Date().toISOString(),
    status: "pending",
    source: "manual",
  };
  upsertThreadsManualPost(post);

  await publishThreadsManualPost(post);
  // Trả về bản mới nhất từ store
  return (
    readThreadsManualHistory().posts.find((p) => p.id === post.id) ?? {
      ...post,
      status: "failed",
    }
  );
}

/**
 * Lên lịch đăng bài cho một thời điểm trong tương lai.
 */
export function scheduleThreadsManualPost(params: {
  content: string;
  mediaType: ThreadsManualMediaType;
  imageUrl?: string;
  scheduledAt: string; // ISO string
}): ThreadsManualPost {
  const post: ThreadsManualPost = {
    id: generateThreadsManualId(),
    content: params.content,
    mediaType: params.mediaType,
    imageUrl: params.imageUrl,
    scheduledAt: params.scheduledAt,
    status: "scheduled",
    source: "manual",
  };
  upsertThreadsManualPost(post);
  console.log(
    `[Threads Manual Scheduler] 📅 Đã hẹn lịch bài ${post.id} cho ${params.scheduledAt}`,
  );
  return post;
}
