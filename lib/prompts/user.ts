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
  return `
  Bạn là người viết nội dung mạng xã hội chuyên đăng series “Mỗi ngày 1 công thức nước ép”.
Mục tiêu: người đọc lướt thấy → hiểu công thức trong vài giây → muốn lưu bài để làm thử.
  Viết 1 bài cho series “Mỗi ngày 1 công thức nước ép”.
Thông tin (có thể trống):
TenCongThuc:
NguyenLieuChinh:
DungCu: ép chậm hoặc xay
Yêu cầu:
Công thức là trung tâm.
Không kể chuyện.
Không nói detox, giảm cân, trị mụn.
Không chèn thời gian/ngày.
Không dùng ký hiệu in đậm.
Đọc là làm được ngay.`;
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

/**
 * User prompt cho OpenAI.
 * Cấu trúc tối giản — system prompt đã chứa toàn bộ quy tắc.
 */
export function buildUserPromptOpenAI(ctx: PromptContext): string {
  return `
  Bạn là người viết nội dung mạng xã hội chuyên đăng series “Mỗi ngày 1 công thức nước ép”.
Mục tiêu: người đọc lướt thấy → hiểu công thức trong vài giây → muốn lưu bài để làm thử.
  Viết 1 bài cho series “Mỗi ngày 1 công thức nước ép”.
Thông tin (có thể trống):
TenCongThuc:
NguyenLieuChinh:
DungCu: ép chậm hoặc xay
Yêu cầu:
Công thức là trung tâm.
Không kể chuyện.
Không nói detox, giảm cân, trị mụn.
Không chèn thời gian/ngày.
Không dùng ký hiệu in đậm.
Đọc là làm được ngay.
`;
}
