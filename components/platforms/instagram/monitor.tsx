"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { InstagramIcon } from "@/components/ui/icons";
import { InstagramComposeForm } from "./compose-form";
import { InstagramPostsList } from "./posts-list";
import { useInstagramDashboard } from "@/hooks/use-instagram-dashboard";
import {
  PlatformMonitorShell,
  PlatformTokenBadge,
  PlatformLoadingState,
  PlatformErrorState,
  PlatformProfileRow,
  PlatformStatsGrid,
  PlatformComposeButton,
} from "@/components/shared/platform-monitor";

type IGAccount = {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  followersCount: number;
  mediaCount: number;
  profilePicture: string | null;
  website: string | null;
};

type TokenInfo = {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
};

type IGData = {
  connected: boolean;
  account: IGAccount | null;
  token: TokenInfo | null;
  error: string | null;
};

export function InstagramMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-4o-mini",
}: {
  aiProviderId?: string;
  aiModel?: string;
}) {
  const [data, setData] = useState<IGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const ig = useInstagramDashboard(aiProviderId, aiModel);

  const fetchAccountInfo = useCallback(async () => {
    setLoading(true);
    try {
      const { data: json } = await axios.get<IGData>("/api/platforms/instagram");
      setData(json);
    } catch {
      setData({ connected: false, account: null, token: null, error: "Không thể kết nối" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccountInfo(); }, []);

  useEffect(() => {
    ig.ensureFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PlatformMonitorShell
      icon={
        <span className="text-pink-500">
          <InstagramIcon className="w-5 h-5" />
        </span>
      }
      title="Instagram Business"
      badge={data?.token && <PlatformTokenBadge token={data.token} />}
    >
      {loading && <PlatformLoadingState />}

      {!loading && !data?.connected && (
        <PlatformErrorState
          title="Chưa kết nối"
          message={data?.error ?? "Kiểm tra IG_ACCESS_TOKEN trong .env"}
        />
      )}

      {!loading && data?.connected && data.account && (
        <div className="space-y-4">
          <PlatformProfileRow
            pictureUrl={data.account.profilePicture}
            name={data.account.name ?? data.account.username ?? "Instagram Account"}
            username={data.account.username}
            bio={data.account.biography}
            link={
              data.account.username
                ? `https://www.instagram.com/${data.account.username}/`
                : null
            }
            fallbackIcon={<InstagramIcon className="w-5 h-5" />}
            fallbackBg="bg-linear-to-br from-purple-100 to-pink-100 text-pink-500"
          />

          <PlatformStatsGrid
            stats={[
              {
                label: "Người theo dõi",
                value: data.account.followersCount.toLocaleString("vi-VN"),
              },
              {
                label: "Bài đăng",
                value: data.account.mediaCount.toLocaleString("vi-VN"),
              },
            ]}
          />

          <PlatformComposeButton
            open={composeOpen}
            onToggle={() => setComposeOpen((o) => !o)}
            className="bg-linear-to-r from-purple-600 via-pink-500 to-orange-400 hover:opacity-90 transition-opacity text-white"
          />

          {composeOpen && (
            <InstagramComposeForm
              keywords={ig.keywords}
              onKeywordsChange={ig.setKeywords}
              caption={ig.caption}
              onCaptionChange={ig.setCaption}
              mediaType={ig.mediaType}
              onMediaTypeChange={ig.setMediaType}
              imageUrl={ig.imageUrl}
              onImageUrlChange={ig.setImageUrl}
              videoUrl={ig.videoUrl}
              onVideoUrlChange={ig.setVideoUrl}
              shareToFeed={ig.shareToFeed}
              onShareToFeedChange={ig.setShareToFeed}
              isScheduled={ig.isScheduled}
              onIsScheduledChange={ig.setIsScheduled}
              scheduledTime={ig.scheduledTime}
              onScheduledTimeChange={ig.setScheduledTime}
              generating={ig.generating}
              loading={ig.loading}
              error={ig.error}
              success={ig.success}
              onGenerate={ig.handleGenerate}
              onPost={ig.handlePost}
            />
          )}

          <InstagramPostsList
            posts={ig.igPosts}
            stats={ig.igStats}
            loading={ig.postsLoading}
            error={ig.postsError}
            onFetch={ig.fetchIGPosts}
            onCancel={ig.handleCancelPost}
          />
        </div>
      )}
    </PlatformMonitorShell>
  );
}
