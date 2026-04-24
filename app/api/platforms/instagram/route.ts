// GET /api/platforms/instagram
// Trả về profile + token status của Instagram Business Account
import { NextRequest, NextResponse } from "next/server";
import { getInstagramService } from "@/lib/services/service-resolver";
import { getAccount } from "@/lib/account-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("accountId") ?? undefined;
  if (accountId) {
    const account = getAccount(accountId);
    if (!account) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: "Tài khoản không tồn tại",
        },
        { status: 404 },
      );
    }
    if (!account.instagram) {
      return NextResponse.json({
        success: true,
        connected: false,
        account: null,
        token: null,
        error: "Tài khoản chưa cấu hình Instagram credentials",
      });
    }
  }

  const instagramService = getInstagramService(accountId);

  const [credResult, tokenResult] = await Promise.allSettled([
    instagramService.getProfile(),
    instagramService.getTokenStatus(),
  ]);

  const profile = credResult.status === "fulfilled" ? credResult.value : null;
  const token = tokenResult.status === "fulfilled" ? tokenResult.value : null;
  const error =
    credResult.status === "rejected" ? String(credResult.reason) : null;

  return NextResponse.json({
    success: true,
    connected: !!profile,
    account: profile
      ? {
          id: profile.id,
          username: profile.username,
          name: profile.name,
          biography: profile.biography,
          followersCount: profile.followersCount,
          followsCount: profile.followsCount,
          mediaCount: profile.mediaCount,
          profilePicture: profile.profilePictureUrl,
          website: profile.website,
        }
      : null,
    token: token
      ? {
          isValid: token.isValid,
          expiresAt: token.expiresAt,
          daysLeft: token.daysLeft,
          scopes: token.scopes,
        }
      : null,
    error,
  });
}
