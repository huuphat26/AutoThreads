// GET  /api/platforms/instagram/media — Danh sách media đã đăng
// POST /api/platforms/instagram/media — Tạo carousel item container (step 1)
import { NextRequest, NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Number(searchParams.get("limit") ?? 12);
  const after = searchParams.get("after") ?? undefined;

  try {
    const result = await instagramService.getMediaList(limit, after);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}
