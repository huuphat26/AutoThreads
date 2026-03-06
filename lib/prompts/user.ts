// ============================================
// AUTO THREADS — User Prompt Builders
// Mỗi provider variant có template riêng.
// ============================================

import type { TopicConfig } from "@/lib/topics";

export interface PromptContext {
  topic: TopicConfig;
  currentTime: string; // "08:30"
  dayOfWeek: string; // "Thứ 2"
  lastTopic?: string; // label của bài trước — để AI tránh lặp
  ctaStyle?: string; // "hoi-gap-khong" | "ru-thu-3-ngay" | "goi-hoi-thuc-don"
  keywords?: string[];
  customPrompt?: string;
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

/**
 * User prompt cho Gemini.
 * Thông tin chủ đề được mô tả rõ để bổ sung cho responseSchema.
 */
export function buildUserPromptGemini(ctx: PromptContext): string {
  if (ctx.customPrompt) {
    return `Hãy viết 1 bài cho series "Hôm nay ăn gì" (#homnayangi) dựa trên mô tả sau:\n${ctx.customPrompt}\n\nThời gian: ${ctx.currentTime} — ${ctx.dayOfWeek}.`;
  }
  const [h] = ctx.currentTime.split(":").map(Number);
  const meal = h < 10 ? "bữa sáng" : h < 14 ? "bữa trưa" : "bữa tối";
  return `Viết 1 bài nhật ký ${meal} cho series "Hôm nay ăn gì" (#homnayangi).
Chủ đề: ${ctx.topic.label}
Gợi ý nội dung: ${ctx.topic.description}${ctx.keywords?.length ? "\nƯu tiên nhắc đến: " + ctx.keywords.join(", ") : ""}${ctx.lastTopic ? "\nBài trước nói về: " + ctx.lastTopic + " — tránh chọn lại." : ""}`;
}

// ─── Puter.js ──────────────────────────────────────────────────────────────────────

/**
 * User prompt cho Puter.js (browser) và Puter API (server).
 * Cấu trúc tối giản — system prompt đã chứa toàn bộ quy tắc.
 */
export function buildUserPromptPuter(ctx: PromptContext): string {
  if (ctx.customPrompt) {
    return `Hãy viết 1 bài cho series "Hôm nay ăn gì" dựa trên mô tả sau:\n${ctx.customPrompt}`;
  }
  const [h] = ctx.currentTime.split(":").map(Number);
  const meal = h < 10 ? "bữa sáng" : h < 14 ? "bữa trưa" : "bữa tối";
  return `Viết 1 bài nhật ký ${meal} cho series "Hôm nay ăn gì" (#homnayangi).
Chủ đề: ${ctx.topic.label}
Gợi ý nội dung: ${ctx.topic.description}${ctx.keywords?.length ? "\nƯu tiên nhắm đến: " + ctx.keywords.join(", ") : ""}${ctx.lastTopic ? "\nBài trước nói về: " + ctx.lastTopic + " — chọn món khác." : ""}`;
}
