import { NextRequest, NextResponse } from "next/server";
import { getFacebookService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId") || undefined;
  const fb = getFacebookService(accountId);

  try {
    const page = await fb.getPage();

    let token = null;
    try {
      token = await fb.getTokenStatus();
    } catch (e) {
      console.warn("[FB API Route] Token debug failed:", e instanceof Error ? e.message : e);
      token = { isValid: true, expiresAt: null, daysLeft: null, scopes: [], appId: null, type: null };
    }

    return NextResponse.json({
      connected: !!page,
      page: page ? {
        id: page.id,
        name: page.name,
        fanCount: page.fanCount,
        followersCount: page.followersCount,
        link: page.link,
        pictureUrl: page.pictureUrl,
        category: page.category,
        about: page.about,
        website: page.website,
      } : null,
      token,
      error: null,
    });
  } catch (err) {
    console.error("[FB API Route] Error:", err);
    return NextResponse.json({
      connected: false,
      page: null,
      token: null,
      error: err instanceof Error ? err.message : "Error connecting to Facebook",
    });
  }
}
