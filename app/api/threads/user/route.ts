// ============================================================
// API Route: /api/threads/user - Profile + Token status + Quota
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";
import { getAccount } from "@/lib/account-store";

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId") ?? undefined;
    if (accountId) {
      const account = getAccount(accountId);
      if (!account) {
        return NextResponse.json(
          { success: false, error: "Tài khoản không tồn tại" },
          { status: 404 },
        );
      }
      if (!account.threads) {
        return NextResponse.json({
          success: true,
          data: {
            profile: null,
            token: null,
            quota: null,
            profileError: "Tài khoản chưa cấu hình Threads credentials",
            tokenExpired: false,
          },
        });
      }
    }

    const threadsService = getThreadsService(accountId);
    const [profile, tokenStatus, quota] = await Promise.allSettled([
      threadsService.getMyProfile(),
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
