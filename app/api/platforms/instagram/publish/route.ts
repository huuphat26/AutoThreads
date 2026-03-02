// POST /api/platforms/instagram/publish
// Full publish flow: quota check → tạo container → poll → publish → trả về media ID + permalink
import { NextRequest, NextResponse } from "next/server";
import { instagramService, IGApiError } from "@/lib/services/instagram.service";
import type { IGPublishParams } from "@/types";

export async function POST(req: NextRequest) {
  let body: IGPublishParams;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body JSON không hợp lệ" },
      { status: 400 },
    );
  }

  // Validate: cần ít nhất imageUrl hoặc videoUrl
  if (!body.imageUrl && !body.videoUrl && !body.children?.length) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Cần cung cấp imageUrl (ảnh), videoUrl (reel) hoặc children (carousel)",
      },
      { status: 400 },
    );
  }

  try {
    const result = await instagramService.publish(body);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const code = err instanceof IGApiError ? err.code : 0;
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        code,
      },
      { status: 400 },
    );
  }
}
