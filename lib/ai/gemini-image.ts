// ============================================
// AUTO THREADS — Gemini Image Generation (Imagen)
// ============================================
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateGeminiImage(
  prompt: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[GeminiImage] Thiếu GEMINI_API_KEY");
    return null;
  }

  try {
    // Lưu ý: Hiện tại Imagen 3 đang được rollout qua Google AI Studio API
    // Nếu SDK chưa hỗ trợ trực tiếp txt2img, ta sẽ dùng Fetch API cho Google AI Studio
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/jpeg",
          },
        }),
      },
    );

    const json = await res.json();
    if (json.predictions?.[0]?.bytesBase64Encoded) {
      return `data:image/jpeg;base64,${json.predictions[0].bytesBase64Encoded}`;
    }

    console.error(
      "[GeminiImage] Gemini Image failed:",
      json.error || "Unknown error",
    );

    // ── Fallback: Pollinations.ai (Flux Model - Tối ưu nhất hiện tại) ──────────
    console.log("[GeminiImage] 🔄 Đang tạo ảnh chất lượng cao với Flux...");
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", cinematic lighting, high resolution, aesthetic")}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000000)}`;
    
    return pollinationsUrl;
  } catch (err) {
    console.error("[GeminiImage] Lỗi kết nối Gemini Image:", err);
    
    // Try Flux as last resort
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`;
  }
}
