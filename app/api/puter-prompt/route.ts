// ============================================
// API Route: /api/puter-prompt
//
// Mục đích: Build system + user prompts rồi trả về client.
// KHÔNG gọi AI — client tự gọi puter.ai.chat() trực tiếp trên browser.
//
// Vì sao cần route này?
//   → Prompt builder cần context server (topics, env…) và đọc từ
//     lib/prompts/ — không muốn expose toàn bộ prompt logic xuống browser.
//   → Client nhận {systemPrompt, userPrompt} → gọi Puter.js.
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { resolveTopicOrRandom } from "@/lib/topics";
import { buildSystemPromptOpenAI } from "@/lib/prompts/system";
import { buildUserPromptOpenAI, type PromptContext } from "@/lib/prompts/user";

// Reuse DAY_MAP thay vì re-declare — giữ DRY với content-generator
const DAY_MAP: Record<number, string> = {
  0: "Chủ Nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Resolve topic (random nếu không truyền — giữ nhất quán với /api/generate)
    const topic = resolveTopicOrRandom(body.topic);

    // Build time context
    const now = new Date();
    const currentTime = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dayOfWeek = DAY_MAP[now.getDay()];

    const ctx: PromptContext = {
      topic,
      currentTime,
      dayOfWeek,
      lastTopic: body.lastTopic,
      ctaStyle: body.ctaStyle,
      keywords: body.keywords,
      customPrompt: body.customPrompt,
    };

    // Dùng OpenAI variant vì Puter proxy OpenAI API
    const systemPrompt = buildSystemPromptOpenAI();
    const userPrompt = buildUserPromptOpenAI(ctx);

    return NextResponse.json({
      success: true,
      data: {
        systemPrompt,
        userPrompt,
        topicLabel: topic.label,
        topicId: topic.id,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
