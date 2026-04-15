// ============================================
// API Route: /api/generate/stream - SSE Streaming
// Topic & slot đều tùy chọn — bỏ trống sẽ random.
// ============================================
import { NextRequest } from "next/server";
import { generateContentStream } from "@/lib/content-generator";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return new Response(
      JSON.stringify({ success: false, error: "Không có quyền truy cập" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = await req.json();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const contentGenerator = generateContentStream({
            topic: body.topic, // optional — random nếu không truyền
            keywords: body.keywords,
            customPrompt: body.customPrompt,
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
