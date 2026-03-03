// ============================================
// AUTO THREADS — Puter Server-Side Provider
//
// Gọi Puter REST API trực tiếp từ server (Node.js) mà không cần
// API key hay window.puter (browser-only CDN).
//
// Endpoint: https://api.puter.com/drivers/call
// Không cần xác thực — Puter miễn phí cho anonymous requests.
// Docs: https://developer.puter.com/tutorials/free-unlimited-openai-api
// ============================================

import type { AIProvider } from "../types";
import { PUTER_DEFAULT_MODEL, PUTER_PROMPT_VARIANT } from "./config";

const PUTER_API_URL = "https://api.puter.com/drivers/call";

/**
 * Trả về headers cho Puter API.
 * Nếu PUTER_API_TOKEN được cấu hình trong .env → thêm Authorization.
 * Nếu không → gọi anonymous (chỉ hoạt động trên browser, không phải server).
 */
function getPuterHeaders(): Record<string, string> {
  const token =
    typeof process !== "undefined" ? process.env.PUTER_API_TOKEN : undefined;
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (token) base["Authorization"] = `Bearer ${token}`;
  return base;
}

/** True nếu đang chạy server-side và KHÔNG có API token → sẽ bị 403 */
export function puterNeedsToken(): boolean {
  if (typeof window !== "undefined") return false; // browser → dùng window.puter
  const token =
    typeof process !== "undefined" ? process.env.PUTER_API_TOKEN : undefined;
  return !token;
}

interface PuterAPIResponse {
  result?: {
    message?: {
      role?: string;
      content?: string | null;
    };
    // stream chunk format
    text?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export class PuterProvider implements AIProvider {
  readonly name = "puter";
  readonly model: string;
  readonly promptVariant = PUTER_PROMPT_VARIANT;

  constructor(model?: string) {
    this.model = model ?? PUTER_DEFAULT_MODEL;
  }

  async complete(userPrompt: string, systemPrompt: string): Promise<string> {
    const body = {
      interface: "puter-chat-completions",
      driver: "openai-completion",
      method: "complete",
      args: {
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    };

    const res = await fetch(PUTER_API_URL, {
      method: "POST",
      headers: getPuterHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      if (res.status === 403) {
        throw new Error(
          `Puter API lỗi 403: Server-side call cần PUTER_API_TOKEN trong .env. ` +
            `Xem: https://developer.puter.com/`,
        );
      }
      throw new Error(`Puter API lỗi ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as PuterAPIResponse;

    if (data.error) {
      throw new Error(
        `Puter API trả lỗi: ${data.error.message ?? data.error.code}`,
      );
    }

    const content = data.result?.message?.content;
    if (!content) throw new Error("Puter API không trả về nội dung");
    return content;
  }

  async *stream(
    userPrompt: string,
    systemPrompt: string,
  ): AsyncGenerator<string> {
    const body = {
      interface: "puter-chat-completions",
      driver: "openai-completion",
      method: "complete",
      args: {
        model: this.model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
    };

    const res = await fetch(PUTER_API_URL, {
      method: "POST",
      headers: getPuterHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      if (res.status === 403) {
        throw new Error(
          `Puter API lỗi 403: Server-side call cần PUTER_API_TOKEN trong .env. ` +
            `Xem: https://developer.puter.com/`,
        );
      }
      throw new Error(`Puter API lỗi ${res.status}: ${errText}`);
    }

    // Puter trả về Server-Sent Events (text/event-stream)
    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback: parse as JSON nếu không có body stream
      const data = (await res.clone().json()) as PuterAPIResponse;
      const content = data.result?.message?.content ?? "";
      if (content) yield content;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const chunk: string =
            json?.choices?.[0]?.delta?.content ??
            json?.result?.text ??
            json?.result?.message?.content ??
            "";
          if (chunk) yield chunk;
        } catch {
          // bỏ qua chunk không parse được
        }
      }
    }
  }
}
