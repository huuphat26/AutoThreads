import { NextRequest, NextResponse } from "next/server";
import { triggerAutoPost } from "@/lib/services/auto-scheduler";
import { initAccountStoreFromKV } from "@/lib/account-store";
import { initContentPoolFromKV } from "@/lib/content-pool";
import { initIGImagePoolFromKV } from "@/lib/ig-image-pool";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

async function initStores(): Promise<void> {
  await initAccountStoreFromKV();
  await initContentPoolFromKV();
  await initIGImagePoolFromKV();
}

export async function GET(request: NextRequest) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = authHeader?.replace("Bearer ", "");
    if (cronSecret !== CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await initStores();

    const searchParams = request.nextUrl.searchParams;
    const slot = searchParams.get("slot") as "evening" | null;
    const platformsParam = searchParams.get("platforms");
    const platforms = platformsParam
      ? (platformsParam.split(",") as Array<"facebook" | "threads" | "instagram">)
      : undefined;

    if (slot) {
      const result = await triggerAutoPost(slot, platforms);
      return NextResponse.json({
        success: true,
        slot,
        platforms,
        record: result,
      });
    }

    const results: Array<{ slot: string; record: unknown }> = [];
    const slots: Array<"evening"> = ["evening"];

    for (const s of slots) {
      try {
        const record = await triggerAutoPost(s, platforms);
        results.push({ slot: s, record });
      } catch (err) {
        results.push({
          slot: s,
          record: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err) {
    console.error("[Cron/Auto] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
