// GET /api/platforms/instagram/quota
// Publishing quota: quota_usage, quota_total, quota_duration
// Không hard-code limit — đọc từ API theo tài liệu Meta
import { NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

export async function GET() {
  try {
    const result = await instagramService.getPublishingLimit();
    return NextResponse.json({ success: true, data: result });
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
