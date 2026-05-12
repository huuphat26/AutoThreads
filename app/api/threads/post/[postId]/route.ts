import { NextRequest, NextResponse } from "next/server";
import { getThreadsService } from "@/lib/services/service-resolver";

export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const { postId } = params;
  const { searchParams } = req.nextUrl;
  const detail = searchParams.get("detail") === "true";
  const accountId = searchParams.get("accountId") || undefined;
  const threads = getThreadsService(accountId);

  try {
    if (detail) {
      const data = await threads.getPostDetail(postId);
      return NextResponse.json({ success: true, data });
    } else {
      const data = await threads.getPost(postId);
      return NextResponse.json({ success: true, data });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
