// ============================================
// AUTO THREADS — AIProvider Interface
// Import từ file này trong tất cả providers.
// ============================================

/**
 * "gemini"  → dùng buildSystemPromptGemini / buildUserPromptGemini
 * "puter"   → dùng buildSystemPromptPuter   / buildUserPromptPuter
 */
export type PromptVariant = "gemini" | "puter";

export interface AIProvider {
  readonly name: string;
  readonly model: string; // tên model đang dùng, hiển thị trên UI
  readonly promptVariant: PromptVariant;

  complete(userPrompt: string, systemPrompt: string): Promise<string>;
  stream(userPrompt: string, systemPrompt: string): AsyncGenerator<string>;
}
