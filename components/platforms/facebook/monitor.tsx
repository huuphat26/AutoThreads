"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FacebookIcon } from "@/components/ui/icons";
import { FacebookComposeForm } from "./compose-form";
import { FacebookPostsList } from "./posts-list";
import { useFacebookDashboard } from "@/hooks/use-facebook-dashboard";
import {
  PlatformMonitorShell,
  PlatformTokenBadge,
  PlatformLoadingState,
  PlatformErrorState,
  PlatformProfileRow,
  PlatformStatsGrid,
  PlatformComposeButton,
} from "@/components/shared/platform-monitor";
import { ImageGeneratorCard } from "@/components/shared/image-generator-card";

type PageInfo = {
  id: string;
  name: string;
  fanCount: number;
  followersCount: number;
  link: string | null;
  pictureUrl: string | null;
  category: string | null;
  about: string | null;
  website: string | null;
};

type TokenInfo = {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
  appId: string | null;
  type: string | null;
};

type FBData = {
  connected: boolean;
  page: PageInfo | null;
  token: TokenInfo | null;
  error: string | null;
};

export function FacebookMonitorBlock({
  aiProviderId = "puter",
  aiModel = "gpt-5.2",
}: {
  aiProviderId?: string;
  aiModel?: string;
  }) {
  const [data, setData] = useState<FBData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const fb = useFacebookDashboard(aiProviderId, aiModel);

  const fetchPageInfo = useCallback(async () => {
    setPageLoading(true);
    try {
      const { data: json } = await axios.get<FBData>("/api/platforms/facebook");
      setData(json);
    } catch {
      setData({
        connected: false,
        page: null,
        token: null,
        error: "Không thể kết nối",
      });
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageInfo();
  }, []);

  useEffect(() => {
    fb.ensureFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = data?.page;
  const token = data?.token;

  return (
    <PlatformMonitorShell
      icon={<FacebookIcon className="w-5 h-5 text-[#1877F2]" />}
      title="Facebook Page"
      badge={token && <PlatformTokenBadge token={token} />}
    >
      {pageLoading && <PlatformLoadingState />}

      {!pageLoading && !data?.connected && (
        <PlatformErrorState
          title="Chưa kết nối"
          message={data?.error ?? "Kiểm tra FB_PAGE_ACCESS_TOKEN trong .env"}
        />
      )}

      {!pageLoading && data?.connected && page && (
        <div className="space-y-4">
          <PlatformProfileRow
            pictureUrl={page.pictureUrl}
            name={page.name}
            category={page.category}
            bio={page.about}
            link={page.link}
            fallbackIcon={<FacebookIcon className="w-5 h-5" />}
            fallbackBg="bg-blue-100 text-[#1877F2]"
          />

          <PlatformStatsGrid
            stats={[
              {
                label: "Người thích",
                value: page.fanCount.toLocaleString("vi-VN"),
              },
              {
                label: "Theo dõi",
                value: page.followersCount.toLocaleString("vi-VN"),
              },
            ]}
          />

          <PlatformComposeButton
            open={composeOpen}
            onToggle={() => setComposeOpen((o) => !o)}
            className="bg-[#1877F2] hover:bg-[#1463cc] text-white transition-colors"
          />

          {composeOpen && (
            <div className="space-y-3">
              <ImageGeneratorCard
                onImageGenerated={(url) => fb.setImageUrl(url)}
              />
              <FacebookComposeForm
                keywords={fb.keywords}
                content={fb.content}
                mediaType={fb.mediaType}
                imageUrl={fb.imageUrl}
                isScheduled={fb.isScheduled}
                scheduledTime={fb.scheduledTime}
                generating={fb.generating}
                loading={fb.loading}
                error={fb.error}
                success={fb.success}
                onKeywordsChange={fb.setKeywords}
                onContentChange={fb.setContent}
                onMediaTypeChange={fb.setMediaType}
                onImageUrlChange={fb.setImageUrl}
                onIsScheduledChange={fb.setIsScheduled}
                onScheduledTimeChange={fb.setScheduledTime}
                onGenerate={fb.handleGenerate}
                onPost={fb.handlePost}
              />
            </div>
          )}

          <FacebookPostsList
            posts={fb.fbPosts}
            stats={fb.fbStats}
            loading={fb.postsLoading}
            error={fb.postsError}
            onFetch={fb.fetchFBPosts}
            onCancel={fb.handleCancelPost}
          />
        </div>
      )}
    </PlatformMonitorShell>
  );
}
