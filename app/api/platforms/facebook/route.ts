// GET /api/platforms/facebook — Trả về thông tin Creator Page + token status
import { NextResponse } from "next/server";
import { facebookService } from "@/lib/services/facebook.service";

export async function GET() {
  try {
    const [page, token] = await Promise.allSettled([
      facebookService.getPage(),
      facebookService.getTokenStatus(),
    ]);

    const pageData = page.status === "fulfilled" ? page.value : null;
    const tokenData = token.status === "fulfilled" ? token.value : null;

    return NextResponse.json({
      success: true,
      connected: pageData !== null,
      page: pageData,
      token: tokenData ?? {
        isValid: false,
        expiresAt: null,
        daysLeft: null,
        scopes: [],
        appId: null,
        type: null,
      },
      error: page.status === "rejected" ? (page.reason as Error).message : null,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      connected: false,
      page: null,
      token: null,
      error: err instanceof Error ? err.message : "Lỗi không xác định",
    });
  }
}
