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
  const lastTopicStr = ctx.lastTopic ?? "(chưa có)";
  const ctaStr = ctx.ctaStyle ?? "hoi-gap-khong";
  const customStr = ctx.customPrompt ? `\n${ctx.customPrompt}` : "";

  return `THỜI GIAN HIỆN TẠI: ${ctx.currentTime} — ${ctx.dayOfWeek}
LastTopic (nếu có): ${lastTopicStr}
CTA kiểu: ${ctaStr}  (chọn 1: hoi-gap-khong | ru-thu-3-ngay | goi-hoi-thuc-don)${customStr}

Hãy tạo 1 bài Threads đúng HOOK → MẸO → CTA, giọng nữ chủ tiệm chia sẻ thật.`;
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

/**
 * User prompt cho OpenAI.
 * Cấu trúc tối giản — system prompt đã chứa toàn bộ quy tắc.
 */
export function buildUserPromptOpenAI(ctx: PromptContext): string {
  const lastTopicStr = ctx.lastTopic ? ctx.lastTopic : "(chưa có)";
  const customStr = ctx.customPrompt ? `\n${ctx.customPrompt}` : "";

  return `THỜI GIAN HIỆN TẠI: ${ctx.currentTime}
THỨ: ${ctx.dayOfWeek}
LastTopic: ${lastTopicStr}${customStr}

Yêu cầu: Viết 1 bài Threads cho Ép Xanh theo đúng HOOK → MẸO → CTA.
CTA chọn 1: (1) hỏi người đọc có gặp không (2) rủ thử 3 ngày (3) gợi nhắn hỏi thực đơn.
Nếu cần "mùi Ép Xanh" thì chỉ nhắc rất nhẹ, kiểu tình cờ, không bán hàng.`;
}
