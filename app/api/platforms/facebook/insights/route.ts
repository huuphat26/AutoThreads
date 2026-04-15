// GET /api/platforms/facebook/insights           — Page-level insights
// GET /api/platforms/facebook/insights?postId=X  — Single post insights
import { NextRequest, NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const postId = searchParams.get("postId");
  const period = (searchParams.get("period") ?? "day") as
    | "day"
    | "week"
    | "month";
  const metricsParam = searchParams.get("metrics");
  const metrics = metricsParam ? metricsParam.split(",") : undefined;

  try {
    if (postId) {
      // Post-level insights
      const insights = await facebookService.getPostInsights(postId);
      return NextResponse.json({ success: true, postId, insights });
    }

    // Page-level insights
    const insights = await facebookService.getPageInsights(metrics, period);
    return NextResponse.json({ success: true, insights });
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
