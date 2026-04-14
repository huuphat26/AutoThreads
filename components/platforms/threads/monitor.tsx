"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ThreadsIcon } from "@/components/ui/icons";
import { ComposeForm } from "@/components/dashboard/compose-form";
import { useDashboard } from "@/hooks/use-dashboard";
import type { ThreadsUser } from "@/types";
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
import { AccountSelector } from "@/components/dashboard/account-selector";

type TokenInfo = {
  isValid: boolean;
  expiresAt: Date | null;
  daysLeft: number;
  scopes: string[];
};

type ProfileData = {
  profile: ThreadsUser | null;
  token: TokenInfo | null;
  quota: {
    used: number;
    total: number;
    remaining: number;
    resetInHours: number;
  } | null;
  profileError?: string | null;
  tokenExpired?: boolean;
};


export function ThreadsMonitorBlock() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const {
    content,
    setContent,
    keywords,
    setKeywords,
    customPrompt: _cp,
    setCustomPrompt,
    mediaType,
    setMediaType,
    imageUrl,
    setImageUrl,
    topicTag,
    setTopicTag,
    isScheduled,
    setIsScheduled,
    scheduledTime,
    setScheduledTime,
    generating,
    loading,
    error,
    success,
    handleGenerate,
    handlePost,
    ensureManualFetched,
    accountId,
    setAccountId,
  } = useDashboard();

  const fetchProfileData = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data: json } = await axios.get<{ success: boolean; data: ProfileData; error?: string }>("/api/threads/user");
      if (json.success) {
        setData(json.data);
      } else {
        setData({ profile: null, token: null, quota: null, profileError: json.error });
      }
    } catch {
      setData({ profile: null, token: null, quota: null, profileError: "Không thể kết nối" });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfileData(); }, []);

  useEffect(() => {
    ensureManualFetched();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = data?.profile;
  const token = data?.token;

  return (
    <PlatformMonitorShell
      icon={<ThreadsIcon className="w-4 h-4 text-slate-800" />}
      title="Tài khoản Threads"
      badge={token && <PlatformTokenBadge token={token} />}
    >
      {profileLoading && <PlatformLoadingState />}

      {!profileLoading && data?.tokenExpired && (
        <PlatformErrorState title="⚠️ Token đã hết hạn">
          <code className="text-[10px] text-rose-500 font-mono mt-1 block">
            bash get-token.sh YOUR_AUTH_CODE
          </code>
        </PlatformErrorState>
      )}

      {!profileLoading && data?.profileError && !data?.tokenExpired && (
        <PlatformErrorState
          title="Không thể tải profile"
          message={data.profileError}
        />
      )}

      {!profileLoading && profile && (
        <div className="space-y-4">
          <PlatformProfileRow
            pictureUrl={profile.threads_profile_picture_url}
            name={profile.name || profile.username}
            username={profile.username}
            bio={profile.threads_biography}
            link={`https://www.threads.com/@${profile.username}`}
            fallbackIcon={
              <span className="text-slate-500 text-base font-bold">
                {(profile.username ?? "?")[0].toUpperCase()}
              </span>
            }
            fallbackBg="bg-slate-100"
          />

          {profile && (
            <PlatformStatsGrid
              stats={[
                {
                  label: "Người theo dõi",
                  value: (profile.followers_count ?? 0).toLocaleString("vi-VN"),
                },
              ]}
            />
          )}

          <PlatformComposeButton
            open={composeOpen}
            onToggle={() => setComposeOpen((o) => !o)}
            openLabel="Thu gọn"
          />

          {composeOpen && (
            <div className="space-y-3">
              <AccountSelector
                value={accountId}
                onChange={setAccountId}
              />
              <ImageGeneratorCard
                onImageGenerated={(url) => setImageUrl(url)}
              />
              <ComposeForm
                content={content}
                keywords={keywords}
                generating={generating}
                loading={loading}
                error={error}
                success={success}
                mediaType={mediaType}
                imageUrl={imageUrl}
                topicTag={topicTag}
                isScheduled={isScheduled}
                scheduledTime={scheduledTime}
                onContentChange={setContent}
                onKeywordsChange={setKeywords}
                onMediaTypeChange={setMediaType}
                onImageUrlChange={setImageUrl}
                onTopicTagChange={setTopicTag}
                onIsScheduledChange={setIsScheduled}
                onScheduledTimeChange={setScheduledTime}
                onGenerate={handleGenerate}
                onPost={handlePost}
              />
            </div>
          )}
        </div>
      )}
    </PlatformMonitorShell>
  );
}
