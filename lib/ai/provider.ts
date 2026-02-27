// ============================================
// AUTO THREADS — AI Provider Factory
//
// Đổi model từ UI: POST /api/ai-config { provider: "openai" }
// Đổi model qua env: AI_PROVIDER=openai (fallback nếu chưa có runtime config)
// Thêm provider mới:
//  1. Tạo file lib/ai/<name>.ts implement AIProvider (từ ./types)
//  2. Import và thêm vào createProvider() bên dưới
//  3. Đặt <NAME>_API_KEY vào .env
// ============================================

import type { AIProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { readAIConfig, getActiveModel } from "./config";

export type { AIProvider };

/**
 * Tự động chọn provider.
 *
 * Thứ tự ưu tiên:
 *   1. data/ai-config.json  (chọn từ UI — cao nhất)
 *   2. AI_PROVIDER env      (chỉ định tường minh)
 *   3. API keys có sẵn     (OPENAI → Gemini)
 */
export function createProvider(): AIProvider {
  const runtimeConfig = readAIConfig();
  const chosen = runtimeConfig.provider.toLowerCase();

  if (chosen === "openai") return new OpenAIProvider(getActiveModel("openai"));
  if (chosen === "gemini") return new GeminiProvider(getActiveModel("gemini"));

  // Fallback: API keys có sẵn
  if (process.env.OPENAI_API_KEY)
    return new OpenAIProvider(getActiveModel("openai"));
  return new GeminiProvider(getActiveModel("gemini"));
}
