// GET /api/platforms/instagram/insights
// Account-level insights: follower_count, reach, views
// Query params: period=day|week|month
import { NextRequest, NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const period = (searchParams.get("period") ?? "day") as
    | "day"
    | "week"
    | "month";
  const metricsParam = searchParams.get("metrics");
  const metrics = metricsParam
    ? metricsParam.split(",")
    : ["follower_count", "reach", "views"];

  try {
    const result = await instagramService.getAccountInsights(metrics, period);
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
