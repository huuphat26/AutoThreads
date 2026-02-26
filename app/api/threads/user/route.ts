// ============================================================
// API Route: /api/threads/user - Profile + Token status + Quota
// ============================================================
import { NextResponse } from "next/server";
import { threadsService } from "@/lib/services/threads.service";

export async function GET() {
  try {
    const [profile, tokenStatus, quota] = await Promise.allSettled([
      threadsService.getMyProfile(),
      threadsService.getTokenStatus(),
      threadsService.getRemainingQuota(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        profile: profile.status === "fulfilled" ? profile.value : null,
        token: tokenStatus.status === "fulfilled" ? tokenStatus.value : null,
        quota: quota.status === "fulfilled" ? quota.value : null,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
