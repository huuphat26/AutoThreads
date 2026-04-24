// GET /api/platforms/facebook — Trả về thông tin Creator Page + token status
import { NextRequest, NextResponse } from "next/server";
import { getFacebookService } from "@/lib/services/service-resolver";
import { getAccount } from "@/lib/account-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId") ?? undefined;
    if (accountId) {
      const account = getAccount(accountId);
      if (!account) {
        return NextResponse.json(
          {
            success: false,
            connected: false,
            page: null,
            token: null,
            error: "Tài khoản không tồn tại",
          },
          { status: 404 },
        );
      }
      if (!account.facebook) {
        return NextResponse.json({
          success: true,
          connected: false,
          page: null,
          token: {
            isValid: false,
            expiresAt: null,
            daysLeft: null,
            scopes: [],
            appId: null,
            type: null,
          },
          error: "Tài khoản chưa cấu hình Facebook credentials",
        });
      }
    }

    const fbSvc = getFacebookService(accountId);
    const [page, token] = await Promise.allSettled([
      fbSvc.getPage(),
      fbSvc.getTokenStatus(),
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
