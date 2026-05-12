import { NextRequest, NextResponse } from "next/server";
import { getAllAutoRecords } from "@/lib/auto-post-store";
import { getAllManualPosts } from "@/lib/services/threads-manual-store";
import type { ScheduledPost, AutoPostRecord, ThreadsManualPost } from "@/types";

export async function GET() {
  try {
    const autoRecords = getAllAutoRecords();
    const manualPosts = getAllManualPosts();

    const posts: ScheduledPost[] = [
      ...autoRecords.map((rec: AutoPostRecord): ScheduledPost => ({
        id: rec.id,
        content: rec.threadsContent || rec.content,
        topic: rec.topic,
        topicLabel: rec.topicLabel,
        scheduledAt: rec.triggeredAt,
        postedAt: rec.threads.postedAt,
        threadsPostId: rec.threads.postId,
        status: rec.threads.status === "posted" ? "posted" : 
                rec.threads.status === "failed" ? "failed" : "pending",
        errorMessage: rec.threads.errorMessage,
        source: "auto",
        mediaType: "IMAGE",
        imageUrl: rec.igImageUrl,
      })),
      ...manualPosts.map((rec: ThreadsManualPost): ScheduledPost => ({
        id: rec.id,
        content: rec.content,
        topic: "",
        topicLabel: "Thủ công",
        scheduledAt: rec.scheduledAt,
        postedAt: rec.postedAt,
        threadsPostId: rec.threadsPostId,
        status: rec.status === "posted" ? "posted" : 
                rec.status === "failed" ? "failed" : 
                rec.status === "cancelled" ? "draft" : "pending",
        errorMessage: rec.errorMessage,
        source: "manual",
        mediaType: rec.mediaType,
        imageUrl: rec.imageUrl,
      }))
    ];

    // Sắp xếp mới nhất trước
    posts.sort((a, b) => {
      const ta = new Date(a.postedAt || a.scheduledAt).getTime();
      const tb = new Date(b.postedAt || b.scheduledAt).getTime();
      return tb - ta;
    });

    // Tính stats
    const stats = {
      total: posts.length,
      posted: posts.filter(p => p.status === "posted").length,
      failed: posts.filter(p => p.status === "failed").length,
      pending: posts.filter(p => p.status === "pending").length,
      draft: posts.filter(p => p.status === "draft").length,
    };

    return NextResponse.json({ success: true, data: { posts, stats } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error" },
      { status: 500 }
    );
  }
}
