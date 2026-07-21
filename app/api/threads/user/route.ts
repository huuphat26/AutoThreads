import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId") || undefined;
  const threads = getThreadsService(accountId);

  try {
    const profile = await threads.getMyProfile();

    let quota = null;
    try {
      quota = await threads.getRemainingQuota();
    } catch (e) {
      console.warn("[Threads API Route] Quota fetch failed:", e instanceof Error ? e.message : e);
      quota = { used: 0, total: 250, remaining: 250, resetInHours: 24 };
    }

    let token = null;
    try {
      token = await threads.getTokenStatus();
    } catch (e) {
      console.warn("[Threads API Route] Token status debug failed:", e instanceof Error ? e.message : e);
      token = { isValid: true, expiresAt: null, daysLeft: -1, scopes: [], username: profile.username || "" };
    }

    return NextResponse.json({
      success: true,
      data: {
        profile,
        quota,
        token,
        profileError: null,
        tokenExpired: token ? !token.isValid : false,
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Error connecting to Threads",
      data: {
        profile: null,
        quota: null,
        token: null,
        profileError: err instanceof Error ? err.message : "Error",
      },
    });
  }
}
