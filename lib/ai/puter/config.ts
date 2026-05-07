// ============================================
// AUTO THREADS — Puter.js Provider Config
//
// Tất cả hằng số liên quan đến Puter được đặt tập trung tại đây.
// Import file này bất cứ khi nào cần thao tác với Puter provider.
//
// Tại sao dùng Puter?
//   → Cho phép dùng model OpenAI (gpt-4o-mini, gpt-4o, …) MIỄN PHÍ
//     mà không cần API key. Puter dùng "User-Pays model" — người dùng
//     cuối tự chịu cost nếu vượt free tier.
// ============================================

import type { ProviderInfo } from "@/types";

// ─── Định danh ───────────────────────────────────────────────────────────────

export const PUTER_PROVIDER_ID = "puter" as const;
export const PUTER_LABEL = "Puter.js (Free OpenAI)";

/** URL CDN inject object `window.puter` vào browser */
export const PUTER_CDN_URL = "https://js.puter.com/v2/";

// ─── Danh sách model hỗ trợ ──────────────────────────────────────────────────
// Puter proxy toàn bộ OpenAI Chat Completions API — model nào OpenAI có,
// Puter đều hỗ trợ. Chỉ liệt kê những model phổ biến + miễn phí nhất.

export const PUTER_MODELS: string[] = [
  "gpt-4o-mini",
  "gpt-4o",
  "claude-3-5-sonnet",
  "meta-llama-3-70b",
];

export const PUTER_DEFAULT_MODEL = "gpt-4o-mini";

// ─── PromptVariant ────────────────────────────────────────────────────────────
// Puter là provider duy nhất → dùng prompt template "puter"

export const PUTER_PROMPT_VARIANT = "puter" as const;

// ─── Provider Info (dùng trong getAvailableProviders) ────────────────────────

/**
 * Tạo ProviderInfo cho Puter từ active model đang được chọn.
 * `available` luôn `true` — Puter không cần API key.
 */
export function buildPuterProviderInfo(activeModel?: string): ProviderInfo {
  return {
    id: PUTER_PROVIDER_ID,
    label: PUTER_LABEL,
    model: activeModel ?? PUTER_DEFAULT_MODEL,
    models: PUTER_MODELS,
    available: true, // không cần API key
  };
}
