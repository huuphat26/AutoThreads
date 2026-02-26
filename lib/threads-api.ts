// ============================================
// AUTO THREADS - Threads API (compatibility layer)
// Delegates to threadsService
// ============================================
import { threadsService } from "./services/threads.service";
import type {
  ThreadsUser,
  ThreadsPostContainer,
  ThreadsPublishResult,
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

export async function getRecentPosts(limit = 10) {
  return threadsService.getMyPosts(limit);
}

export async function checkRateLimit() {
  return threadsService.getPublishingLimit();
}
