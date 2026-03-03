// ============================================
// AUTO THREADS — AI Provider Factory
//
// Provider duy nhất: Puter (miễn phí, không cần API key trên browser).
// Đổi model từ UI: POST /api/ai-config { provider: "puter", model: "gpt-4o" }
// ============================================

import type { AIProvider } from "./types";
import { PuterProvider } from "./puter/provider";
import { getActiveModel } from "./config";
import { PUTER_PROVIDER_ID } from "./puter/config";

export type { AIProvider };

/**
 * Luôn trả về PuterProvider.
 * Puter hoạt động trên browser qua window.puter.ai.chat() — không cần API key.
 * Server-side cần PUTER_API_TOKEN trong .env (dùng cho auto-scheduler).
 */
export function createProvider(): AIProvider {
  return new PuterProvider(getActiveModel(PUTER_PROVIDER_ID));
}
