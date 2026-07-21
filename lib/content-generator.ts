import type { GenerateContentRequest, GenerateContentResponse } from "@/types";
import { resolveTopicOrRandom, getRandomTopic } from "@/lib/topics";
import { createProvider } from "@/lib/ai/provider";
import { parseAIResponse } from "@/lib/ai/parser";
import {
  buildSystemPromptGemini,
  buildSystemPromptPuter,
} from "@/lib/prompts/system";
import {
  buildUserPromptGemini,
  buildUserPromptPuter,
  type PromptContext,
} from "@/lib/prompts/user";

const DAY_MAP: Record<number, string> = {
  0: "Chủ Nhật",
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
};

function getNowContext(): { currentTime: string; dayOfWeek: string } {
  const now = new Date();
  const currentTime = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayOfWeek = DAY_MAP[now.getDay()];
  return { currentTime, dayOfWeek };
}

function buildPrompts(
  variant: "gemini" | "puter",
  ctx: PromptContext,
): { systemPrompt: string; userPrompt: string } {
  if (variant === "puter") {
    return {
      systemPrompt: buildSystemPromptPuter(),
      userPrompt: buildUserPromptPuter(ctx),
    };
  }
  return {
    systemPrompt: buildSystemPromptGemini(),
    userPrompt: buildUserPromptGemini(ctx),
  };
}

export async function generateContent(
  req: GenerateContentRequest = {},
): Promise<GenerateContentResponse> {
  const topic = resolveTopicOrRandom(req.topic);
  const { currentTime, dayOfWeek } = getNowContext();

  const provider = createProvider();

  const ctx: PromptContext = {
    topic,
    currentTime,
    dayOfWeek,
    lastTopic: req.lastTopic,
    ctaStyle: req.ctaStyle,
    keywords: req.keywords,
    customPrompt: req.customPrompt,
  };

  const { systemPrompt, userPrompt } = buildPrompts(
    provider.promptVariant,
    ctx,
  );

  const raw = await provider.complete(userPrompt, systemPrompt);

  const result = parseAIResponse(raw);
  result.topicLabel = topic.label;
  return result;
}

/**
 * Tạo IG caption ngắn từ nội dung đã có.
 * Caption IG: ≤ 300 ký tự + 5-8 hashtag liên quan.
 * Thực chất wrap lại fullPost rồi yêu cầu AI rút gọn + thêm hashtag.
 */
export async function generateIGCaption(
  fullPost: string,
): Promise<string> {
  const provider = createProvider();

  const systemPrompt = `Bạn là copywriter Instagram. Nhiệm vụ: rút gọn bài đăng thành IG caption ngắn gọn.
QUY TẮC:
- Tối đa 280 ký tự (không tính hashtag)
- Giữ tên công thức + vài nguyên liệu chính + một câu kết
- Câu văn tự nhiên, tươi vui
- Thêm đúng 6 hashtag tiếng Việt liên quan ở cuối (dòng riêng)
- Không dùng ký hiệu in đậm, không emoji quá nhiều (tối đa 2)
- Trả về CHỈ caption + hashtag, không giải thích thêm`;

  const userPrompt = `Rút gọn bài đăng sau thành IG caption (≤280 ký tự) + 6 hashtag:

${fullPost}`;

  const raw = await provider.complete(userPrompt, systemPrompt);
  // Trả về text thô (không parse JSON vì đây là plain text)
  return raw.trim();
}

export async function* generateContentStream(
  req: GenerateContentRequest = {},
): AsyncGenerator<string> {
  const topic = resolveTopicOrRandom(req.topic);
  const { currentTime, dayOfWeek } = getNowContext();

  const provider = createProvider();

  const ctx: PromptContext = {
    topic,
    currentTime,
    dayOfWeek,
    lastTopic: req.lastTopic,
    ctaStyle: req.ctaStyle,
    keywords: req.keywords,
    customPrompt: req.customPrompt,
  };

  const { systemPrompt, userPrompt } = buildPrompts(
    provider.promptVariant,
    ctx,
  );

  yield* provider.stream(userPrompt, systemPrompt);
}

export function getTopicForSlot(): string {
  return getRandomTopic().id;
}
