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

/** Supported image-generation models for puter.ai.txt2img() */
type PuterImageModel =
  | "gpt-image-1.5"
  | "gpt-image-1-mini"
  | "gpt-image-1"
  | "dall-e-3"
  | "dall-e-2";

interface PuterTxt2ImgOptions {
  /** Image generation model — defaults to "dall-e-3" if omitted */
  model?: PuterImageModel | string;
}

interface PuterAI {
  /**
   * Tạo ảnh từ text prompt.
   * Trả về HTMLImageElement — src là blob URL hoặc hosted URL.
   * Supported models: gpt-image-1.5 | gpt-image-1-mini | gpt-image-1 | dall-e-3 | dall-e-2
   */
  txt2img(
    prompt: string,
    options?: PuterTxt2ImgOptions,
  ): Promise<HTMLImageElement>;

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

  /** Phân tích ảnh — non-streaming */
  chat(
    prompt: string,
    imageUrl: string,
    options?: PuterAIChatOptions & { stream?: false },
  ): Promise<PuterAIChatResult>;

  /** Phân tích ảnh — streaming */
  chat(
    prompt: string,
    imageUrl: string,
    options: PuterAIChatOptions & { stream: true },
  ): Promise<AsyncIterable<PuterAIStreamChunk>>;

  /** Overload chung */
  chat(
    prompt: string | PuterAIChatMessage[],
    imageUrlOrOptions?: string | PuterAIChatOptions,
    options?: PuterAIChatOptions,
  ): Promise<PuterAIChatResult | AsyncIterable<PuterAIStreamChunk>>;
}

interface PuterUser {
  username: string;
  uuid: string;
  email?: string;
}

interface PuterAuth {
  /** Lấy thông tin user đang đăng nhập */
  getUser(): Promise<PuterUser>;
  /** Đăng xuất khỏi Puter */
  signOut(): Promise<void>;
}

/** Object toàn cục `puter` được inject bởi CDN */
interface Puter {
  ai: PuterAI;
  auth: PuterAuth;
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
