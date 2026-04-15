// ============================================
// API Route: /api/ai-config
// GET  → trả về provider hiện tại + danh sách available
// POST → đổi provider runtime (không cần restart)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  readAIConfig,
  setRuntimeProvider,
  setRuntimeModel,
  getAvailableProviders,
  getCurrentProviderInfo,
} from "@/lib/ai/config";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

export async function GET() {
  const current = getCurrentProviderInfo();
  const config = readAIConfig();
  const providers = getAvailableProviders();

  return NextResponse.json({
    success: true,
    data: {
      current,
      providers,
      updatedAt: config.updatedAt,
    },
  });
}

export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { provider, model } = body;

    if (!provider || typeof provider !== "string") {
      return NextResponse.json(
        { success: false, error: "Thiếu trường provider" },
        { status: 400 },
      );
    }

    const available = getAvailableProviders();
    const target = available.find((p) => p.id === provider.toLowerCase());

    if (!target) {
      return NextResponse.json(
        { success: false, error: `Provider "${provider}" không tồn tại` },
        { status: 400 },
      );
    }

    if (!target.available) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${target.label}" chưa cấu hình API key trong .env`,
        },
        { status: 400 },
      );
    }

    // If a specific model is provided, validate and set it
    if (model && typeof model === "string") {
      if (!target.models.includes(model)) {
        return NextResponse.json(
          {
            success: false,
            error: `Model "${model}" không có trong danh sách`,
          },
          { status: 400 },
        );
      }
      const config = setRuntimeModel(provider, model);
      return NextResponse.json({
        success: true,
        data: { provider: config.provider, model, updatedAt: config.updatedAt },
      });
    }

    const config = setRuntimeProvider(provider);

    return NextResponse.json({
      success: true,
      data: { provider: config.provider, updatedAt: config.updatedAt },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
