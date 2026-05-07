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
import {
  buildSystemPromptPuter,
  buildSystemPromptThreads,
  buildSystemPromptIGCaption,
} from "@/lib/prompts/system";
import { buildUserPromptPuter, type PromptContext } from "@/lib/prompts/user";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

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
  return NextResponse.json(
    { success: false, error: "Puter prompts are disabled." },
    { status: 403 },
  );
}
