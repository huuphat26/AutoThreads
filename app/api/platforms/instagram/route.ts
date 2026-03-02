// GET /api/platforms/instagram
// Trả về profile + token status của Instagram Business Account
import { NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

export async function GET() {
  if (!process.env.IG_ACCESS_TOKEN?.trim() || !process.env.IG_USER_ID?.trim()) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: "Chưa cấu hình IG_ACCESS_TOKEN hoặc IG_USER_ID trong .env",
    });
  }

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
