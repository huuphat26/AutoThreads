import type { GenerateContentRequest, GenerateContentResponse } from "@/types";
import { resolveTopicOrRandom, getRandomTopic } from "@/lib/topics";
import { createProvider } from "@/lib/ai/provider";
import { parseAIResponse } from "@/lib/ai/parser";
import {
  buildSystemPromptGemini,
  buildSystemPromptOpenAI,
} from "@/lib/prompts/system";
import {
  buildUserPromptGemini,
  buildUserPromptOpenAI,
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
  variant: "gemini" | "openai",
  ctx: PromptContext,
): { systemPrompt: string; userPrompt: string } {
  if (variant === "openai") {
    return {
      systemPrompt: buildSystemPromptOpenAI(),
      userPrompt: buildUserPromptOpenAI(ctx),
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
