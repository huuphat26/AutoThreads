import { threadsService } from "./services/threads.service";
import type {
  ThreadsUser,
  ThreadsPostContainer,
  ThreadsPublishResult,
  ThreadsMediaType,
} from "@/types";

export { threadsService };

export async function getThreadsUser(): Promise<ThreadsUser> {
  return threadsService.getMyProfile();
}

export async function createTextContainer(
  text: string,
): Promise<ThreadsPostContainer> {
  const id = await threadsService.createTextContainer(text);
  return { id };
}

export async function createImageContainer(
  imageUrl: string,
  text?: string,
): Promise<ThreadsPostContainer> {
  const id = await threadsService.createImageContainer({ imageUrl, text });
  return { id };
}

export async function publishContainer(
  containerId: string,
): Promise<ThreadsPublishResult> {
  const id = await threadsService.publishContainer(containerId);
  return { id };
}

export async function postToThreads(text: string): Promise<string> {
  const result = await threadsService.publishTextPost(text);
  return result.postId;
}

/**
 * Đăng bài có hình ảnh lên Threads
 * @param imageUrl - URL ảnh công khai (HTTPS)
 * @param text - Caption / chú thích (tùy chọn)
 * @returns Post ID từ Threads
 */
export async function postImageToThreads(
  imageUrl: string,
  text?: string,
): Promise<string> {
  const result = await threadsService.publishImagePost(imageUrl, text);
  return result.postId;
}

/**
 * Đăng bài có video lên Threads
 * @param videoUrl - URL video công khai (HTTPS, MP4)
 * @param text - Caption / chú thích (tùy chọn)
 * @returns Post ID từ Threads
 */
export async function postVideoToThreads(
  videoUrl: string,
  text?: string,
): Promise<string> {
  const result = await threadsService.publishVideoPost(videoUrl, text);
  return result.postId;
}

/**
 * Đăng bài lên Threads — tự động chọn flow dựa theo mediaType
 */
export async function postMediaToThreads(opts: {
  text: string;
  mediaType?: ThreadsMediaType;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<string> {
  const { text, mediaType = "TEXT", imageUrl, videoUrl } = opts;

  switch (mediaType) {
    case "IMAGE":
      if (!imageUrl)
        throw new Error("imageUrl là bắt buộc khi mediaType = IMAGE");
      return postImageToThreads(imageUrl, text);
    case "VIDEO":
      if (!videoUrl)
        throw new Error("videoUrl là bắt buộc khi mediaType = VIDEO");
      return postVideoToThreads(videoUrl, text);
    default:
      return postToThreads(text);
  }
}

export async function deleteThreadsPost(
  threadsPostId: string,
): Promise<boolean> {
  return threadsService.deletePost(threadsPostId);
}

export async function getRecentPosts(limit = 10) {
  return threadsService.getMyPosts(limit);
}

/**
 * Kéo toàn bộ bài đăng của user bằng cursor pagination
 * @param opts.pageSize   - Số bài mỗi trang (mặc định 50)
 * @param opts.maxPages   - Tối đa số trang (mặc định 20 = ~1000 bài)
 * @param opts.afterCursor - Cursor để tiếp tục phân trang
 */
export async function getAllThreadsPosts(opts?: {
  pageSize?: number;
  maxPages?: number;
  afterCursor?: string;
}) {
  return threadsService.getAllMyThreads(opts);
}

/**
 * Lấy insights chi tiết của một bài đăng từ Threads API
 * GET /{media-id}/insights?metric=views,likes,replies,reposts,quotes
 */
export async function getMediaInsights(mediaId: string) {
  return threadsService.getMediaInsights(mediaId);
}

/**
 * Lấy đầy đủ thông tin bài đăng + insights
 * Gộp getPost + getMediaInsights trong 1 lần gọi
 */
export async function getPostDetail(mediaId: string) {
  return threadsService.getPostDetail(mediaId);
}

export async function checkRateLimit() {
  return threadsService.getPublishingLimit();
}
