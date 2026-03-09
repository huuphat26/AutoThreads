// ============================================================
// Service Resolver — Lấy service instance theo accountId
// Nếu accountId là env-default hoặc undefined → dùng singleton mặc định
// Nếu accountId là custom account → tạo service mới với credentials override
// ============================================================

import { getCredentials } from "@/lib/account-store";
import { threadsService } from "@/lib/services/threads.service";
import { facebookService } from "@/lib/services/facebook.service";
import { instagramService } from "@/lib/services/instagram.service";

/**
 * Lấy ThreadsService instance cho accountId.
 * Nếu env-default hoặc không có → trả về singleton.
 */
export function getThreadsService(accountId?: string) {
  if (!accountId || accountId === "env-default") return threadsService;

  const creds = getCredentials(accountId, "threads");
  if (!creds) return threadsService;

  return threadsService.withCredentials(creds.accessToken, creds.userId);
}

/**
 * Lấy FacebookService instance cho accountId.
 */
export function getFacebookService(accountId?: string) {
  if (!accountId || accountId === "env-default") return facebookService;

  const creds = getCredentials(accountId, "facebook");
  if (!creds) return facebookService;

  return facebookService.withCredentials(creds.accessToken, creds.userId);
}

/**
 * Lấy InstagramService instance cho accountId.
 */
export function getInstagramService(accountId?: string) {
  if (!accountId || accountId === "env-default") return instagramService;

  const creds = getCredentials(accountId, "instagram");
  if (!creds) return instagramService;

  return instagramService.withCredentials(creds.accessToken, creds.userId);
}
