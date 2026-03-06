// ============================================
// Hook: usePuterImageGenerate
//
// Flow:
//   1. Gọi window.puter.ai.txt2img(prompt, { model })
//   2. Tự động thử lần lượt các model nếu model hiện tại lỗi
//   3. Upload ảnh kết quả lên Cloudinary (qua /api/upload-image)
//   4. Trả về HTTPS Cloudinary URL — dùng được cho FB, Threads, IG
//
// Lý do dùng Cloudinary:
//   Puter trả về blob: URL (browser-only) không dùng được server-side.
//   Cloudinary cung cấp HTTPS URL công khai.
// ============================================
"use client";

import { useState, useCallback } from "react";
import { uploadImageToCloud } from "@/lib/cloudinary-upload";

/** Tất cả model ảnh được Puter hỗ trợ, ưu tiên chất lượng cao trước */
const PUTER_IMAGE_MODELS = [
  "dall-e-3",
  "gpt-image-1",
  "gpt-image-1.5",
  "gpt-image-1-mini",
  "dall-e-2",
] as const;

export type PuterImageModel = (typeof PUTER_IMAGE_MODELS)[number];

export function usePuterImageGenerate() {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [usedModel, setUsedModel] = useState<string>("");

  const generate = useCallback(
    async (
      prompt: string,
      preferredModel?: PuterImageModel | string,
    ): Promise<string | null> => {
      if (!prompt.trim()) {
        setError("Thiếu image prompt");
        return null;
      }

      setGenerating(true);
      setError("");
      setImageUrl("");
      setUsedModel("");

      try {
        const puter = typeof window !== "undefined" ? window.puter : undefined;
        if (!puter) {
          throw new Error(
            "Puter.js chưa được tải. Vui lòng tải lại trang và thử lại.",
          );
        }

        // Build ordered model list: preferred first, then the rest
        const orderedModels: string[] = preferredModel
          ? [
              preferredModel,
              ...PUTER_IMAGE_MODELS.filter((m) => m !== preferredModel),
            ]
          : [...PUTER_IMAGE_MODELS];

        let lastError: unknown = null;

        for (const model of orderedModels) {
          try {
            const img = await puter.ai.txt2img(prompt, { model });
            const rawUrl = img.src;
            setUsedModel(model);
            setGenerating(false);

            // Upload lên Cloudinary để lấy HTTPS public URL
            setUploading(true);
            const cloudUrl = await uploadImageToCloud(rawUrl);
            setImageUrl(cloudUrl);
            return cloudUrl;
          } catch (err) {
            lastError = err;
            // Continue to next model
          }
        }

        // All models failed
        const msg =
          lastError instanceof Error
            ? lastError.message
            : "Tất cả model đều lỗi — vui lòng thử lại sau.";
        throw new Error(msg);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Lỗi khi tạo ảnh";
        setError(msg);
        return null;
      } finally {
        setGenerating(false);
        setUploading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setImageUrl("");
    setError("");
    setUsedModel("");
    setUploading(false);
  }, []);

  return { generating, uploading, imageUrl, error, usedModel, generate, reset, PUTER_IMAGE_MODELS };
}

