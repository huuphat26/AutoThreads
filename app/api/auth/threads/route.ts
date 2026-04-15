// ============================================================
// API Route: /api/auth/threads
// Quản lý token: xác thực, debug, refresh
// Chỉ dùng cá nhân — bảo vệ bằng CRON_SECRET
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import {
  canUsePrivilegedRoute,
  hasValidCronSecret,
} from "@/lib/server/request-auth";
import { threadsService } from "@/lib/services/threads.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskToken(token: string): string {
  const t = token.trim();
  if (t.length <= 12) {
    return `${t.slice(0, 2)}***${t.slice(-2)}`;
  }
  return `${t.slice(0, 6)}...${t.slice(-6)}`;
}

// ── GET /api/auth/threads ──────────────────────────────────
// Trả về: trạng thái token + thông tin tài khoản + quota
export async function GET(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // Chạy song song: verify + token status + quota
    const [credentials, tokenStatus, quota] = await Promise.allSettled([
      threadsService.verifyCredentials(),
      threadsService.getTokenStatus(),
      threadsService.getRemainingQuota(),
    ]);

    const cred =
      credentials.status === "fulfilled"
        ? credentials.value
        : {
            ok: false,
            userId: "",
            username: "",
            error: String(credentials.reason),
          };

    const token =
      tokenStatus.status === "fulfilled"
        ? tokenStatus.value
        : { isValid: false, expiresAt: null, daysLeft: -1, scopes: [] };

    const q =
      quota.status === "fulfilled"
        ? quota.value
        : { used: 0, total: 250, remaining: 250, resetInHours: 24 };

    return NextResponse.json({
      success: true,
      data: {
        account: {
          connected: cred.ok,
          userId: cred.userId,
          username: cred.username,
          error: "error" in cred ? cred.error : undefined,
        },
        token: {
          isValid: token.isValid,
          expiresAt: token.expiresAt,
          daysLeft: token.daysLeft,
          scopes: token.scopes,
          // Cảnh báo nếu còn dưới 10 ngày
          warning:
            token.daysLeft >= 0 && token.daysLeft <= 10
              ? `⚠️ Token hết hạn sau ${token.daysLeft} ngày! Hãy refresh ngay.`
              : null,
        },
        quota: q,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ── POST /api/auth/threads ─────────────────────────────────
// body.action:
//   "refresh"  → refresh long-lived token hiện tại
//   "exchange" → đổi short-lived token thành long-lived (cần body.shortToken)
//   "verify"   → chỉ ping xác thực nhanh (không cần secret)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action: "refresh" | "exchange" | "verify";
      shortToken?: string;
      includeToken?: boolean;
    };

    // verify vẫn cho phép từ UI same-origin, các action còn lại yêu cầu route đặc quyền
    if (!canUsePrivilegedRoute(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const canShowRawToken =
      body.includeToken === true && hasValidCronSecret(req);

    switch (body.action) {
      case "verify": {
        const result = await threadsService.verifyCredentials();
        return NextResponse.json({ success: true, data: result });
      }

      case "refresh": {
        const result = await threadsService.refreshLongLivedToken();
        return NextResponse.json({
          success: true,
          data: {
            message: `Token đã refresh! Hết hạn sau ${Math.round(result.expires_in / 86400)} ngày.`,
            ...(canShowRawToken
              ? { newToken: result.access_token }
              : { tokenPreview: maskToken(result.access_token) }),
            expiresIn: result.expires_in,
            instruction: canShowRawToken
              ? "Cập nhật THREADS_ACCESS_TOKEN trong .env với giá trị newToken ở trên."
              : "Gọi lại với includeToken=true và x-cron-secret hợp lệ nếu cần nhận token đầy đủ.",
          },
        });
      }

      case "exchange": {
        if (!body.shortToken) {
          return NextResponse.json(
            { success: false, error: "Thiếu shortToken" },
            { status: 400 },
          );
        }
        const result = await threadsService.exchangeForLongLivedToken(
          body.shortToken,
        );
        return NextResponse.json({
          success: true,
          data: {
            message: `Đổi token thành công! Hết hạn sau ${Math.round(result.expires_in / 86400)} ngày.`,
            ...(canShowRawToken
              ? { longLivedToken: result.access_token }
              : { tokenPreview: maskToken(result.access_token) }),
            expiresIn: result.expires_in,
            instruction: canShowRawToken
              ? "Lưu longLivedToken vào THREADS_ACCESS_TOKEN trong .env."
              : "Gọi lại với includeToken=true và x-cron-secret hợp lệ nếu cần nhận token đầy đủ.",
          },
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "action không hợp lệ (verify | refresh | exchange)",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
