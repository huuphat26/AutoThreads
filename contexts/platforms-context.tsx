"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import axios from "axios";

export type PlatformAccount = {
  connected: boolean;
  name: string;
  pictureUrl: string | null;
  followersCount: number;
  likesCount: number;
  link?: string;
};

type PlatformsData = {
  facebook: PlatformAccount | null;
  instagram: PlatformAccount | null;
  threads: PlatformAccount | null;
};

type FBResponse = {
  success: boolean;
  connected: boolean;
  page: {
    id: string;
    name: string;
    fanCount: number;
    followersCount: number;
    pictureUrl: string | null;
    link: string | null;
  } | null;
};

type IGResponse = {
  success: boolean;
  connected: boolean;
  account: {
    username: string;
    name: string;
    followersCount: number;
    profilePicture: string | null;
  } | null;
};

type ThreadsResponse = {
  success: boolean;
  data: {
    profile: {
      id: string;
      name: string;
      username: string;
      followers_count: number;
      threads_profile_picture_url: string | null;
    } | null;
  } | null;
};

const DEFAULT_DATA: PlatformsData = {
  facebook: null,
  instagram: null,
  threads: null,
};

function getDefaultPlatform(platform: keyof PlatformsData): PlatformAccount {
  const names: Record<keyof PlatformsData, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    threads: "Threads",
  };
  return {
    connected: false,
    name: names[platform],
    pictureUrl: null,
    followersCount: 0,
    likesCount: 0,
  };
}

async function fetchFacebook(): Promise<PlatformAccount> {
  try {
    const res = await axios.get<FBResponse>("/api/platforms/facebook");
    if (res.data.success && res.data.connected && res.data.page) {
      return {
        connected: true,
        name: res.data.page.name,
        pictureUrl: res.data.page.pictureUrl,
        followersCount: res.data.page.followersCount || 0,
        likesCount: res.data.page.fanCount || 0,
        link: res.data.page.link || undefined,
      };
    }
  } catch {
    // fall through to default
  }
  return getDefaultPlatform("facebook");
}

async function fetchInstagram(): Promise<PlatformAccount> {
  try {
    const res = await axios.get<IGResponse>("/api/platforms/instagram");
    if (res.data.success && res.data.connected && res.data.account) {
      return {
        connected: true,
        name: res.data.account.username,
        pictureUrl: res.data.account.profilePicture,
        followersCount: res.data.account.followersCount || 0,
        likesCount: 0,
      };
    }
  } catch {
    // fall through to default
  }
  return getDefaultPlatform("instagram");
}

async function fetchThreads(): Promise<PlatformAccount> {
  try {
    const res = await axios.get<ThreadsResponse>("/api/threads/user");
    if (res.data.success && res.data.data?.profile) {
      const profile = res.data.data.profile;
      return {
        connected: true,
        name: profile.name || profile.username,
        pictureUrl: profile.threads_profile_picture_url,
        followersCount: profile.followers_count || 0,
        likesCount: 0,
      };
    }
  } catch {
    // fall through to default
  }
  return getDefaultPlatform("threads");
}

type PlatformsContextValue = {
  data: PlatformsData;
  loading: boolean;
  refetch: () => void;
};

const PlatformsContext = createContext<PlatformsContextValue | null>(null);

function usePlatformsProvider() {
  const [data, setData] = useState<PlatformsData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);

  const fetchPlatforms = useCallback(async () => {
    setLoading(true);
    try {
      const [fb, ig, th] = await Promise.all([
        fetchFacebook(),
        fetchInstagram(),
        fetchThreads(),
      ]);
      const newData = { facebook: fb, instagram: ig, threads: th };
      setData(newData);
    } catch {
      setData({
        facebook: getDefaultPlatform("facebook"),
        instagram: getDefaultPlatform("instagram"),
        threads: getDefaultPlatform("threads"),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return { data, loading, refetch };
}

export function PlatformsProvider({ children }: { children: ReactNode }) {
  const value = usePlatformsProvider();
  return (
    <PlatformsContext.Provider value={value}>
      {children}
    </PlatformsContext.Provider>
  );
}

export function usePlatforms(): PlatformsContextValue {
  const context = useContext(PlatformsContext);
  if (!context) {
    throw new Error("usePlatforms must be used within PlatformsProvider");
  }
  return context;
}
