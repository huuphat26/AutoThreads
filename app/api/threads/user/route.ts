// ============================================================
// API Route: /api/threads/user - Profile + Token status + Quota
// ============================================================
import { NextResponse } from "next/server";
import { getThreadsUser, threadsService } from "@/lib/threads-api";

export async function GET() {
  try {
    const [profile, tokenStatus, quota] = await Promise.allSettled([
      getThreadsUser(),
      threadsService.getTokenStatus(),
      threadsService.getRemainingQuota(),
    ]);

    // Lấy lỗi từ getMyProfile nếu thất bại
    const profileError =
      profile.status === "rejected"
        ? String((profile.reason as Error)?.message ?? profile.reason)
        : null;

    // Phát hiện token hết hạn (OAuthException code 190)
    const isTokenExpired =
      profileError?.includes("190") ||
      profileError?.toLowerCase().includes("session has expired") ||
      profileError?.toLowerCase().includes("expired");

    return NextResponse.json({
      success: true,
      data: {
        profile: profile.status === "fulfilled" ? profile.value : null,
        token: tokenStatus.status === "fulfilled" ? tokenStatus.value : null,
        quota: quota.status === "fulfilled" ? quota.value : null,
        profileError,
        tokenExpired: isTokenExpired,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
