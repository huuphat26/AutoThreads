// ============================================
// AUTO THREADS — Runtime AI Config
// Lưu lựa chọn provider/model trong bộ nhớ (in-memory).
// Giá trị mặc định lấy từ environment variables.
// ============================================

import type { ProviderInfo } from "@/types";

// ─── Model Catalog ────────────────────────────────────────────────────────────

export const MODEL_CATALOG: Record<string, string[]> = {
  gemini: [
    // "gemini-2.0-flash", // Bản ổn định, tốc độ cao
    // "gemini-2.0-pro", // Bản ổn định, suy luận chuyên sâu thay cho 2.0-pro-exp
    // "gemini-3-flash", // Model thế hệ mới nhất, cực nhanh
    "gemini-3-flash-preview", // Bản xem trước của dòng 3 (nếu bạn muốn trải nghiệm sớm)
    // "gemini-3-pro", // Model mạnh nhất hiện tại thay cho 3.0-pro
    // "gemini-1.5-pro", // Bản ổn định kinh điển với cửa sổ ngữ cảnh cực lớn
  ],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-4", "o3-mini"],
};

// ─── Config Schema ────────────────────────────────────────────────────────────

export interface AIRuntimeConfig {
  /** provider đang được chọn: "gemini" | "openai" | ... */
  provider: string;
  /** model cụ thể đang được chọn cho từng provider */
  models: Record<string, string>;
  /** Unix timestamp lần cuối đổi */
  updatedAt: string;
}

/** Default model cho từng provider */
function defaultModel(providerId: string): string {
  const envModels: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_MODEL,
    openai: process.env.OPENAI_MODEL,
  };
  return envModels[providerId] ?? MODEL_CATALOG[providerId]?.[0] ?? providerId;
}

const DEFAULT_CONFIG: AIRuntimeConfig = {
  provider: (process.env.AI_PROVIDER ?? "").toLowerCase() || "gemini",
  models: {},
  updatedAt: new Date().toISOString(),
};

// ─── In-memory store (works on Vercel serverless) ────────────────────────────

let _runtimeConfig: AIRuntimeConfig = { ...DEFAULT_CONFIG };

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function readAIConfig(): AIRuntimeConfig {
  return { ..._runtimeConfig };
}

export function writeAIConfig(config: AIRuntimeConfig): void {
  _runtimeConfig = { ...config };
}

export function setRuntimeProvider(provider: string): AIRuntimeConfig {
  const current = readAIConfig();
  const config: AIRuntimeConfig = {
    ...current,
    provider: provider.toLowerCase(),
    updatedAt: new Date().toISOString(),
  };
  writeAIConfig(config);
  return config;
}

export function setRuntimeModel(
  providerId: string,
  model: string,
): AIRuntimeConfig {
  const current = readAIConfig();
  const config: AIRuntimeConfig = {
    ...current,
    // Also switch active provider to this one
    provider: providerId.toLowerCase(),
    models: { ...current.models, [providerId.toLowerCase()]: model },
    updatedAt: new Date().toISOString(),
  };
  writeAIConfig(config);
  return config;
}

/** Lấy model đang được chọn cho một provider */
export function getActiveModel(providerId: string): string {
  const config = readAIConfig();
  return config.models[providerId.toLowerCase()] ?? defaultModel(providerId);
}

// ─── Available providers ──────────────────────────────────────────────────────

/** Thông tin một AI provider — exported từ @/types, giữ lại ở đây để backward-compat */
export type { ProviderInfo };

export function getAvailableProviders(): ProviderInfo[] {
  const config = readAIConfig();
  return [
    {
      id: "gemini",
      label: "Google Gemini",
      model: config.models["gemini"] ?? defaultModel("gemini"),
      models: MODEL_CATALOG["gemini"],
      available: Boolean(process.env.GEMINI_API_KEY),
    },
    {
      id: "openai",
      label: "OpenAI",
      model: config.models["openai"] ?? defaultModel("openai"),
      models: MODEL_CATALOG["openai"],
      available: Boolean(process.env.OPENAI_API_KEY),
    },
  ];
}

/** Lấy thông tin provider hiện tại đang được chọn */
export function getCurrentProviderInfo(): ProviderInfo {
  const config = readAIConfig();
  const providers = getAvailableProviders();
  return providers.find((p) => p.id === config.provider) ?? providers[0];
}
