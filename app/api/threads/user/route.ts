import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId") || undefined;
  const threads = getThreadsService(accountId);

  try {
    const [profile, quota, token] = await Promise.all([
      threads.getMyProfile(),
      threads.getRemainingQuota(),
      threads.getTokenStatus(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile,
        quota,
        token,
        profileError: null,
        tokenExpired: !token.isValid,
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
