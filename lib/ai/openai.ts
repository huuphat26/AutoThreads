// ============================================
// AUTO THREADS — OpenAI Provider
// Bật: thêm OPENAI_API_KEY vào .env
// Tuỳ chọn: OPENAI_MODEL (mặc định gpt-4o-mini)
// ============================================
// npm install openai

import type { AIProvider } from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  readonly promptVariant = "openai" as const;

  constructor(model?: string) {
    this.model = model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  private getClient() {
    // Dynamic import để không bắt buộc cài openai nếu không dùng
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OpenAI } = require("openai");
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      throw new Error("OPENAI_API_KEY chưa được cấu hình trong .env");
    return new OpenAI({ apiKey });
  }

  async complete(userPrompt: string, systemPrompt: string): Promise<string> {
    const client = this.getClient();
    const res = await client.chat.completions.create({
      model: this.model,
      temperature: 0.85,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const text = res.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("OpenAI không trả về nội dung");
    return text;
  }

  async *stream(
    userPrompt: string,
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const client = this.getClient();
    const stream = await client.chat.completions.create({
      model: this.model,
      temperature: 0.85,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content ?? "";
      if (text) yield text;
    }
  }
}
