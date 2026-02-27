// ============================================
// AUTO THREADS — Gemini Provider
// SDK: @google/genai  |  Model: runtime-configurable
// ============================================

import { GoogleGenAI, Type } from "@google/genai";
import type { AIProvider } from "./types";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  return new GoogleGenAI({ apiKey });
}

const GENERATION_CONFIG = {
  temperature: 0.85,
  maxOutputTokens: 2048,
};

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly model: string;
  readonly promptVariant = "gemini" as const;

  constructor(model?: string) {
    this.model = model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  }

  async complete(userPrompt: string, systemPrompt: string): Promise<string> {
    const ai = getClient();

    const res = await ai.models.generateContent({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...GENERATION_CONFIG,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            content: {
              type: Type.STRING,
              description:
                "Nội dung bài đăng Threads hoàn chỉnh gồm đủ 3 phần: hook, mẹo/gợi mở, CTA.",
            },
          },
          required: ["content"],
        },
      },
    });

    // Ưu tiên lấy text từ candidates, fallback res.text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidate = (res as any)?.candidates?.[0];
    if (candidate?.content?.parts?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return candidate.content.parts.map((p: any) => p.text ?? "").join("");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = (res as any)?.text ?? "";
    if (!text) throw new Error("Gemini không trả về nội dung");
    return text;
  }

  async *stream(
    userPrompt: string,
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const ai = getClient();

    const responseStream = ai.models.generateContentStream({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        ...GENERATION_CONFIG,
      },
    });

    for await (const chunk of await responseStream) {
      const text = chunk.text;
      if (text) yield text;
    }
  }
}
