import type { ProviderInfo } from "@/types";
import {
  PUTER_PROVIDER_ID,
  PUTER_MODELS,
  PUTER_DEFAULT_MODEL,
  buildPuterProviderInfo,
} from "./puter/config";

// ─── Model Catalog ────────────────────────────────────────────────────────────

export const MODEL_CATALOG: Record<string, string[]> = {
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro"],
  openai: ["gpt-4o-mini", "gpt-4-turbo"],
  [PUTER_PROVIDER_ID]: PUTER_MODELS,
};

export interface AIRuntimeConfig {
  provider: string;
  models: Record<string, string>;
  updatedAt: string;
}

/** Default model cho từng provider */
function defaultModel(providerId: string): string {
  const envModels: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_MODEL,
    openai: process.env.OPENAI_MODEL,
    [PUTER_PROVIDER_ID]: process.env.PUTER_MODEL ?? PUTER_DEFAULT_MODEL,
  };
  return envModels[providerId] ?? MODEL_CATALOG[providerId]?.[0] ?? providerId;
}

const DEFAULT_CONFIG: AIRuntimeConfig = {
  provider: (process.env.AI_PROVIDER ?? "").toLowerCase() || PUTER_PROVIDER_ID,
  models: { [PUTER_PROVIDER_ID]: PUTER_DEFAULT_MODEL },
  updatedAt: new Date().toISOString(),
};

let _runtimeConfig: AIRuntimeConfig = { ...DEFAULT_CONFIG };

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
    buildPuterProviderInfo(
      config.models[PUTER_PROVIDER_ID] ?? defaultModel(PUTER_PROVIDER_ID),
    ),
  ];
}

export function getCurrentProviderInfo(): ProviderInfo {
  const config = readAIConfig();
  const providers = getAvailableProviders();
  return providers.find((p) => p.id === config.provider) ?? providers[0];
}
