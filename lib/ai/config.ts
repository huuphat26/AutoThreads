// ============================================
// AUTO THREADS — Runtime AI Config
// Lưu lựa chọn provider/model vào data/ai-config.json
// để có thể đổi model từ UI mà không cần restart.
// ============================================

import fs from "fs";
import path from "path";
import type { ProviderInfo } from "@/types";

const CONFIG_FILE = path.join(process.cwd(), "data", "ai-config.json");

// ─── Model Catalog ────────────────────────────────────────────────────────────

export const MODEL_CATALOG: Record<string, string[]> = {
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-pro-exp",
    "gemini-2.5-pro-exp-03-25",
    "gemini-3-flash-preview",
    "gemini-3.0-pro",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-4",
    "o1-mini",
    "o3-mini",
  ],
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

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function readAIConfig(): AIRuntimeConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AIRuntimeConfig>;
      return {
        provider: parsed.provider ?? DEFAULT_CONFIG.provider,
        models: parsed.models ?? {},
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }
  } catch {
    // file corrupt → dùng default
  }
  return { ...DEFAULT_CONFIG };
}

export function writeAIConfig(config: AIRuntimeConfig): void {
  const dataDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
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
