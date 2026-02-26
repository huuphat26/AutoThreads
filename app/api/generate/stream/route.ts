// ============================================
// API Route: /api/generate/stream - SSE Streaming
// ============================================
import { NextRequest } from "next/server";
import {
  generateContentStream,
  getTopicForSlot,
} from "@/lib/content-generator";
import type { ContentTopic, PostSlot } from "@/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const slot: PostSlot = body.slot || "morning";
    const topic: ContentTopic = body.topic || getTopicForSlot(slot);
    const keywords: string[] = body.keywords || [];
    const customPrompt: string = body.customPrompt || "";

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contentGenerator = generateContentStream({
            topic,
            slot,
            keywords,
            customPrompt,
          });

          for await (const chunk of contentGenerator) {
            const data = JSON.stringify({ chunk });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi không xác định";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
