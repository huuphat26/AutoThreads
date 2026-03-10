import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = authHeader?.replace("Bearer ", "");
    if (cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.json({
    success: true,
    message: "Scheduled posts feature disabled (history not stored)",
    note: "View posts directly on platforms (Facebook, Instagram, Threads)",
  });
}
