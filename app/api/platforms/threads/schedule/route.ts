import { NextRequest, NextResponse } from "next/server";
import { getAllManualPosts, upsertManualPost, deleteManualPost } from "@/lib/services/threads-manual-store";
import { getThreadsService } from "@/lib/services/service-resolver";
import type { ThreadsManualPost } from "@/types";
import { initAllStores } from "@/lib/services/store-initializer";

export async function GET() {
  try {
    await initAllStores();
    const posts = getAllManualPosts();
    const stats = {
      total: posts.length,
      scheduled: posts.filter(p => p.status === "scheduled").length,
      posted: posts.filter(p => p.status === "posted").length,
      failed: posts.filter(p => p.status === "failed").length,
      pending: posts.filter(p => p.status === "pending").length,
      cancelled: posts.filter(p => p.status === "cancelled").length,
    };
    return NextResponse.json({ success: true, data: { posts, stats } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await initAllStores();
    const body = await req.json();
    const { content, mediaType, imageUrl, scheduledAt, accountId } = body;

    const id = `manual-${Date.now()}`;
    const post: ThreadsManualPost = {
      id,
      accountId,
      content,
      mediaType,
      imageUrl,
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: scheduledAt ? "scheduled" : "pending",
      source: "manual",
    };

    if (!scheduledAt) {
      // Đăng ngay
      const threads = getThreadsService(accountId);
      try {
        let threadsPostId: string;
        if (mediaType === "IMAGE" && imageUrl) {
          const res = await threads.publishImagePost(imageUrl, content);
          threadsPostId = res.postId;
        } else {
          const res = await threads.publishTextPost(content);
          threadsPostId = res.postId;
        }
        post.threadsPostId = threadsPostId;
        post.status = "posted";
        post.postedAt = new Date().toISOString();
      } catch (err) {
        post.status = "failed";
        post.errorMessage = err instanceof Error ? err.message : "Error publishing";
      }
    }

    upsertManualPost(post);
    return NextResponse.json({ success: true, data: post });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await initAllStores();
    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    if (id) {
      deleteManualPost(id);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
