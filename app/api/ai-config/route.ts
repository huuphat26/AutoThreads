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
  return NextResponse.json(
    { success: false, error: "AI config is disabled." },
    { status: 403 },
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "AI config is disabled." },
    { status: 403 },
  );
}
