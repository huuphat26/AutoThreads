// ============================================
// AUTO THREADS — Puter.js Global Type Declaration
// Khai báo kiểu cho object `puter` toàn cục được inject bởi CDN.
// Ref: https://developer.puter.com/tutorials/free-unlimited-openai-api
// ============================================

interface PuterAIChatOptions {
  /** Tên model AI: "gpt-4o-mini" | "gpt-4o" | "claude-3-5-sonnet" | ... */
  model?: string;
  /** Bật streaming — trả về AsyncIterable thay vì Promise */
  stream?: boolean;
}

/** Một message trong cuộc trò chuyện */
interface PuterAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Kết quả khi stream = false */
interface PuterAIChatResult {
  message: {
    role: string;
    content: string;
  };
  index: number;
  finish_reason: string | null;
}

/** Một chunk khi stream = true */
interface PuterAIStreamChunk {
  text: string;
}

interface PuterAI {
  /** Non-streaming: trả về full response */
  chat(
    prompt: string | PuterAIChatMessage[],
    options?: PuterAIChatOptions & { stream?: false },
  ): Promise<PuterAIChatResult>;

  /** Streaming: trả về AsyncIterable theo từng chunk */
  chat(
    prompt: string | PuterAIChatMessage[],
    options: PuterAIChatOptions & { stream: true },
  ): Promise<AsyncIterable<PuterAIStreamChunk>>;

  /** Overload chung */
  chat(
    prompt: string | PuterAIChatMessage[],
    options?: PuterAIChatOptions,
  ): Promise<PuterAIChatResult | AsyncIterable<PuterAIStreamChunk>>;
}

/** Object toàn cục `puter` được inject bởi CDN */
interface Puter {
  ai: PuterAI;
}

declare global {
  interface Window {
    /** Có sẵn sau khi CDN script https://js.puter.com/v2/ tải xong */
    puter?: Puter;
  }
}

export type {
  Puter,
  PuterAI,
  PuterAIChatMessage,
  PuterAIChatResult,
  PuterAIStreamChunk,
};
