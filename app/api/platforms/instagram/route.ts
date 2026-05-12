import { NextRequest, NextResponse } from "next/server";
import { getInstagramService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId") || undefined;
  const ig = getInstagramService(accountId);

  try {
    // Lấy profile trước — đây là phần quan trọng nhất
    const profile = await ig.getProfile();

    // Lấy token status riêng, nếu lỗi thì vẫn trả về profile
    let token = null;
    try {
      token = await ig.getTokenStatus();
    } catch (e) {
      console.warn("[IG API Route] Token debug failed (expected if App ID/Secret missing):", e instanceof Error ? e.message : e);
      token = { isValid: true, expiresAt: null, daysLeft: null, scopes: [], appId: null };
    }

    const profileData = profile ? {
      id: profile.id,
      username: profile.username,
      name: profile.name,
      biography: profile.biography,
      followersCount: profile.followersCount,
      mediaCount: profile.mediaCount,
      profilePicture: profile.profilePictureUrl,
      website: profile.website,
    } : null;

    return NextResponse.json({
      connected: !!profile,
      account: profileData,
      token,
      error: null,
    });
  } catch (err) {
    console.error("[IG API Route] Error:", err);
    return NextResponse.json({
      connected: false,
      account: null,
      token: null,
      error: err instanceof Error ? err.message : "Error connecting to Instagram",
    });
  }
}
