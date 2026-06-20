import { initAccountStoreFromKV } from "@/lib/account-store";
import { initContentPoolFromKV } from "@/lib/content-pool";
import { initIGImagePoolFromKV } from "@/lib/ig-image-pool";
import { initAutoPostHistoryFromKV } from "@/lib/auto-post-store";
import { initThreadsManualHistoryFromKV } from "@/lib/services/threads-manual-store";

const isVercel = process.env.VERCEL === "1";

/**
 * Initialize all JSON file stores from Vercel KV if running on Vercel.
 * This runs concurrently to avoid blocking requests.
 */
export async function initAllStores(): Promise<void> {
  if (!isVercel) return;
  try {
    await Promise.all([
      initAccountStoreFromKV(),
      initContentPoolFromKV(),
      initIGImagePoolFromKV(),
      initAutoPostHistoryFromKV(),
      initThreadsManualHistoryFromKV(),
    ]);
  } catch (err) {
    console.error("[Store Initializer] Failed to initialize stores from KV:", err);
  }
}
