// ============================================
// Hook: usePuterGenerate
//
// Xử lý toàn bộ luồng sinh nội dung qua Puter.js **trên browser**:
//   1. GET prompts từ server  →  POST /api/puter-prompt
//   2. Gọi window.puter.ai.chat() với streaming
//   3. Cập nhật UI theo từng chunk (callback onChunk)
//   4. Parse kết quả cuối bằng parseAIResponse (cùng parser với backend)
//
// Tại sao hook riêng?
//   → Tách biệt hoàn toàn Puter logic khỏi useDashboard — không chồng chéo
//     với luồng backend (Gemini / OpenAI có API key).
//   → Dễ disable / bật tắt mà không ảnh hưởng provider khác.
// ============================================
"use client";

import { useState, useCallback } from "react";
import type { GenerateContentRequest } from "@/types";
import { parseAIResponse } from "@/lib/ai/parser";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PuterGenerateOptions {
  /**
   * Callback được gọi sau mỗi chunk khi streaming.
   * `accumulated` là toàn bộ text đã nhận được tính đến lúc đó.
   * Dùng để cập nhật UI theo thời gian thực.
   */
  onChunk?: (accumulated: string) => void;
}

export interface PuterGenerateResult {
  fullPost: string;
  topicLabel?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePuterGenerate() {
  const [generating, setGenerating] = useState(false);

  /**
   * Sinh nội dung qua Puter.js.
   *
   * @param req     Giống GenerateContentRequest (topic, keywords, customPrompt…)
   * @param model   Model AI của Puter: "gpt-4o-mini" | "gpt-4o" | …
   * @param opts    Tuỳ chọn: { onChunk } để stream live lên UI
   * @returns       { fullPost, topicLabel } hoặc null nếu lỗi
   */
  const generate = useCallback(
    async (
      req: GenerateContentRequest,
      model: string,
      opts?: PuterGenerateOptions,
    ): Promise<PuterGenerateResult | null> => {
      setGenerating(true);
      try {
        // ── Step 1: Lấy prompts từ server ──────────────────────────────────
        const promptRes = await fetch("/api/puter-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });

        const promptJson = await promptRes.json();
        if (!promptJson.success) {
          throw new Error(promptJson.error ?? "Không thể build prompts");
        }

        const { systemPrompt, userPrompt, topicLabel } = promptJson.data as {
          systemPrompt: string;
          userPrompt: string;
          topicLabel: string;
        };

        // ── Step 2: Kiểm tra puter đã sẵn sàng ────────────────────────────
        const puterRef =
          typeof window !== "undefined" ? window.puter : undefined;

        if (!puterRef) {
          throw new Error(
            "Puter.js chưa được tải. Vui lòng tải lại trang và thử lại.",
          );
        }

        // ── Step 3: Stream từ Puter.js ─────────────────────────────────────
        // Dùng messages array (OpenAI format) — Puter proxy hoàn toàn OpenAI API
        const stream = (await puterRef.ai.chat(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          { model, stream: true },
        )) as AsyncIterable<{ text: string }>;

        let accumulated = "";
        for await (const chunk of stream) {
          if (chunk.text) {
            accumulated += chunk.text;
            // Cập nhật UI theo thời gian thực
            opts?.onChunk?.(accumulated);
          }
        }

        if (!accumulated.trim()) {
          throw new Error("Puter.js không trả về nội dung");
        }

        // ── Step 4: Parse kết quả cuối ─────────────────────────────────────
        // Dùng cùng parser với backend — chịu được cả JSON lẫn plain text
        const parsed = parseAIResponse(accumulated);
        parsed.topicLabel = topicLabel;

        return { fullPost: parsed.fullPost, topicLabel: parsed.topicLabel };
      } finally {
        setGenerating(false);
      }
    },
    [],
  );

  return { generating, generate };
}
