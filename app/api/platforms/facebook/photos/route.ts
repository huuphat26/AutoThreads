// POST /api/platforms/facebook/photos — Đăng bài có ảnh lên Page
import { NextRequest, NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";

/** POST — Đăng ảnh kèm caption lên page */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, caption } = body as {
      imageUrl?: string;
      caption?: string;
    };

    if (!imageUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: "Trường 'imageUrl' không được để trống" },
        { status: 400 },
      );
    }

    const result = await facebookService.publishPhoto(
      imageUrl.trim(),
      caption?.trim(),
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
