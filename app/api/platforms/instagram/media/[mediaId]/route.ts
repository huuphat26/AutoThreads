// GET  /api/platforms/instagram/media/[mediaId] — Chi tiết media + comments + insights
// POST /api/platforms/instagram/media/[mediaId] — Toggle is_comment_enabled (chưa implement)
import { NextRequest, NextResponse } from "next/server";
import { instagramService } from "@/lib/services/instagram.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const { searchParams } = req.nextUrl;
  const includeComments = searchParams.get("comments") !== "false";
  const includeInsights = searchParams.get("insights") !== "false";

  try {
    const [mediaResult, commentsResult, insightsResult] =
      await Promise.allSettled([
        instagramService.getMedia(mediaId),
        includeComments
          ? instagramService.getMediaComments(mediaId)
          : Promise.resolve([]),
        includeInsights
          ? instagramService.getMediaInsights(mediaId)
          : Promise.resolve(null),
      ]);

    const media = mediaResult.status === "fulfilled" ? mediaResult.value : null;
    if (!media) {
      return NextResponse.json(
        {
          success: false,
          error:
            mediaResult.status === "rejected"
              ? String(mediaResult.reason)
              : "Không tìm thấy media",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      media,
      comments:
        commentsResult.status === "fulfilled" ? commentsResult.value : [],
      insights:
        insightsResult.status === "fulfilled" ? insightsResult.value : null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 400 },
    );
  }
}
