import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get("accountId") || undefined;
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const all = searchParams.get("all") === "true";
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const maxPages = parseInt(searchParams.get("maxPages") || "20", 10);
  
  const threads = getThreadsService(accountId);

  try {
    if (all) {
      const data = await threads.getAllMyThreads({ pageSize, maxPages });
      return NextResponse.json({ success: true, data });
    } else {
      const data = await threads.getMyPosts(limit);
      return NextResponse.json({ success: true, data });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
