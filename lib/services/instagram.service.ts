// ============================================================
// AUTO THREADS — Instagram Graph API Service
// Sử dụng Instagram API with Instagram Login
// Host: https://graph.instagram.com/v25.0
// debug_token: https://graph.facebook.com/v25.0/debug_token
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
// ============================================================
import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  IGProfile,
  IGMedia,
  IGComment,
  IGMediaInsights,
  IGAccountInsights,
  IGPublishingLimit,
  IGPublishParams,
  IGPublishResult,
  IGTokenStatus,
  IGContainerStatus,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────
// Instagram API with Instagram Login dùng graph.instagram.com
const BASE_URL = "https://graph.instagram.com/v25.0";
// debug_token vẫn nằm trên graph.facebook.com
const FB_BASE_URL = "https://graph.facebook.com/v25.0";

/** Timeout chờ container sẵn sàng (ms) */
const CONTAINER_POLL_TIMEOUT_MS = 60_000;
/** Interval poll trạng thái container (ms) */
const CONTAINER_POLL_INTERVAL_MS = 3_000;

// ─── Custom Error ─────────────────────────────────────────────
export class IGApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly subcode: number,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "IGApiError";
  }
}

// ─── Parse Meta error ─────────────────────────────────────────
function parseMetaError(err: unknown): IGApiError {
  if (err instanceof AxiosError && err.response?.data?.error) {
    const e = err.response.data.error as {
      message: string;
      code: number;
      error_subcode?: number;
    };
    return new IGApiError(
      e.code,
      e.error_subcode ?? 0,
      `[Meta ${e.code}] ${e.message}`,
      err.response.data,
    );
  }
  if (err instanceof Error) return new IGApiError(0, 0, err.message, err);
  return new IGApiError(0, 0, String(err));
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Meta error codes được coi là transient (có thể retry):
 *   2  - Unexpected error, please retry later
 *   1  - Unknown error
 *  -1  - An unknown error occurred (internal)
 *   4  - Application request limit reached (throttle)
 * 341  - Application limit reached
 */
const TRANSIENT_CODES = new Set([2, 1, -1, 4, 341]);

/**
 * Retry một async fn tối đa `maxAttempts` lần với exponential backoff.
 * Chỉ retry nếu lỗi có code nằm trong TRANSIENT_CODES.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 5_000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isTransient =
        err instanceof IGApiError && TRANSIENT_CODES.has(err.code);
      if (!isTransient || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 5s, 10s, 20s
      console.warn(
        `[IG API] ⚠️  Lỗi tạm thời (code ${(err as IGApiError).code}), thử lại lần ${attempt + 1}/${maxAttempts} sau ${delay / 1000}s...`,
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

// ─── Instagram Service ────────────────────────────────────────
class InstagramService {
  private http: AxiosInstance;
  /** Chỉ dùng cho debug_token — endpoint này nằm trên graph.facebook.com */
  private fbHttp: AxiosInstance;
  private _overrideToken?: string;
  private _overrideUserId?: string;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 20_000 });
    this.fbHttp = axios.create({ baseURL: FB_BASE_URL, timeout: 10_000 });
  }

  /** Tạo instance mới với credentials override (multi-account) */
  withCredentials(token: string, userId: string): InstagramService {
    const svc = new InstagramService();
    svc._overrideToken = token;
    svc._overrideUserId = userId;
    return svc;
  }

  // ------------------------------------------------------------------
  // SECTION 1: CONFIG
  // ------------------------------------------------------------------

  private get token(): string {
    if (this._overrideToken) return this._overrideToken;
    const t = process.env.IG_ACCESS_TOKEN;
    if (!t) throw new Error("IG_ACCESS_TOKEN chưa cấu hình trong .env");
    return t.trim();
  }

  private get userId(): string {
    if (this._overrideUserId) return this._overrideUserId;
    const id = process.env.IG_USER_ID;
    if (!id) throw new Error("IG_USER_ID chưa cấu hình trong .env");
    return id.trim();
  }

  private get appId(): string | undefined {
    return (process.env.IG_APP_ID ?? process.env.FB_APP_ID)?.trim();
  }

  private get appSecret(): string | undefined {
    return (process.env.IG_APP_SECRET ?? process.env.FB_APP_SECRET)?.trim();
  }

  // ------------------------------------------------------------------
  // SECTION 2: TOKEN MANAGEMENT
  // ------------------------------------------------------------------

  /**
   * Kiểm tra token hiện tại qua debug_token endpoint
   * Trả về thông tin: còn hạn, ngày hết hạn, scopes
   */
  async getTokenStatus(): Promise<IGTokenStatus> {
    const appId = this.appId;
    const appSecret = this.appSecret;

    if (!appId || !appSecret) {
      // Không có app credentials → không thể debug, vẫn trả về dữ liệu hữu ích
      return {
        isValid: true,
        expiresAt: null,
        daysLeft: null,
        scopes: [],
        appId: null,
      };
    }

    try {
      // debug_token phải gọi qua graph.facebook.com, không phải graph.instagram.com
      const res = await this.fbHttp.get("/debug_token", {
        params: {
          input_token: this.token,
          access_token: `${appId}|${appSecret}`,
        },
      });

      const d = res.data.data;
      const expiresAt = d.expires_at ? new Date(d.expires_at * 1000) : null;
      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
        : null;

      return {
        isValid: d.is_valid ?? false,
        expiresAt: expiresAt?.toISOString() ?? null,
        daysLeft,
        scopes: d.scopes ?? [],
        appId: d.app_id ?? appId,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 3: PROFILE
  // ------------------------------------------------------------------

  /**
   * Lấy thông tin profile từ /me (dùng để resolve IG User ID từ token)
   * Useful để verify token + lấy username nhanh
   */
  async getMe(): Promise<{
    id: string;
    username: string | null;
    name: string | null;
  }> {
    try {
      const res = await this.http.get("/me", {
        params: {
          fields: "id,username,name,profile_picture_url",
          access_token: this.token,
        },
      });
      return {
        id: res.data.id,
        username: res.data.username ?? null,
        name: res.data.name ?? null,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Lấy toàn bộ thông tin profile của IG Business Account
   * GET /{IG_USER_ID}?fields=id,biography,followers_count,...
   */
  async getProfile(): Promise<IGProfile> {
    try {
      // biography & follows_count yêu cầu permission bổ sung — bỏ khỏi fields mặc định
      const res = await this.http.get(`/${this.userId}`, {
        params: {
          fields:
            "id,followers_count,media_count,name,profile_picture_url,username,website",
          access_token: this.token,
        },
      });
      const d = res.data;
      return {
        id: d.id,
        username: d.username ?? null,
        name: d.name ?? null,
        biography: null,
        followersCount: d.followers_count ?? 0,
        followsCount: d.follows_count ?? 0,
        mediaCount: d.media_count ?? 0,
        profilePictureUrl: d.profile_picture_url ?? null,
        website: d.website ?? null,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Verify nhanh token + lấy thông tin cơ bản
   * Dùng cho health check
   */
  async verifyCredentials(): Promise<{
    ok: boolean;
    userId: string;
    username: string;
    error?: string;
  }> {
    try {
      const profile = await this.getProfile();
      return {
        ok: true,
        userId: profile.id,
        username: profile.username ?? profile.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, userId: "", username: "", error: msg };
    }
  }

  // ------------------------------------------------------------------
  // SECTION 4: MEDIA — List & Read
  // ------------------------------------------------------------------

  /**
   * Lấy danh sách media đã đăng
   * GET /{IG_USER_ID}/media?fields=...
   *
   * @param limit - Số bài tối đa (mặc định 12)
   * @param after - Cursor phân trang (lấy từ response.paging.cursors.after)
   */
  async getMediaList(
    limit = 12,
    after?: string,
  ): Promise<{
    data: IGMedia[];
    paging: { next?: string; cursors?: { before: string; after: string } };
  }> {
    try {
      const params: Record<string, string | number> = {
        fields:
          "id,caption,comments_count,like_count,media_product_type,media_type,media_url,permalink,shortcode,thumbnail_url,timestamp,username,is_comment_enabled",
        limit,
        access_token: this.token,
      };
      if (after) params.after = after;

      const res = await this.http.get(`/${this.userId}/media`, { params });

      const data: IGMedia[] = (res.data.data ?? []).map(
        (item: Record<string, unknown>) => ({
          id: item.id as string,
          caption: (item.caption as string) ?? null,
          commentsCount: (item.comments_count as number) ?? 0,
          likeCount: (item.like_count as number) ?? 0,
          mediaProductType:
            (item.media_product_type as IGMedia["mediaProductType"]) ?? null,
          mediaType: item.media_type as IGMedia["mediaType"],
          mediaUrl: (item.media_url as string) ?? null,
          permalink: (item.permalink as string) ?? null,
          shortcode: (item.shortcode as string) ?? null,
          thumbnailUrl: (item.thumbnail_url as string) ?? null,
          timestamp: item.timestamp as string,
          username: (item.username as string) ?? null,
          isCommentEnabled: Boolean(item.is_comment_enabled ?? true),
        }),
      );

      return { data, paging: res.data.paging ?? {} };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Lấy chi tiết một media object
   * GET /{IG_MEDIA_ID}?fields=...
   */
  async getMedia(mediaId: string): Promise<IGMedia> {
    try {
      const res = await this.http.get(`/${mediaId}`, {
        params: {
          fields:
            "id,caption,comments_count,like_count,media_product_type,media_type,media_url,permalink,shortcode,thumbnail_url,timestamp,username,is_comment_enabled",
          access_token: this.token,
        },
      });
      const item = res.data;
      return {
        id: item.id,
        caption: item.caption ?? null,
        commentsCount: item.comments_count ?? 0,
        likeCount: item.like_count ?? 0,
        mediaProductType: item.media_product_type ?? null,
        mediaType: item.media_type,
        mediaUrl: item.media_url ?? null,
        permalink: item.permalink ?? null,
        shortcode: item.shortcode ?? null,
        thumbnailUrl: item.thumbnail_url ?? null,
        timestamp: item.timestamp,
        username: item.username ?? null,
        isCommentEnabled: item.is_comment_enabled ?? true,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 5: PUBLISHING
  // ------------------------------------------------------------------
  // Flow theo Meta docs:
  //   1. Kiểm tra quota publishing limit
  //   2. POST /{IG_USER_ID}/media → tạo container → container ID
  //   3. GET /{container_id}?fields=status,status_code → poll đến FINISHED
  //   4. POST /{IG_USER_ID}/media_publish?creation_id=... → publish
  // ------------------------------------------------------------------

  /**
   * Kiểm tra quota trước khi đăng
   * GET /{IG_USER_ID}/content_publishing_limit
   * KHÔNG hard-code limit — đọc từ API
   */
  async getPublishingLimit(): Promise<IGPublishingLimit> {
    try {
      const res = await this.http.get(
        `/${this.userId}/content_publishing_limit`,
        {
          params: {
            fields: "quota_usage,config",
            access_token: this.token,
          },
        },
      );
      const item = res.data.data?.[0] ?? res.data;
      return {
        quotaUsage: item.quota_usage ?? 0,
        quotaTotal: item.config?.quota_total ?? 50,
        quotaDuration: item.config?.quota_duration ?? 86400,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Bước 2: Tạo IG media container
   * POST /{IG_USER_ID}/media
   * Trả về container ID để poll + publish
   */
  async createMediaContainer(params: IGPublishParams): Promise<string> {
    return withRetry(async () => {
      const queryParams: Record<string, string> = {
        access_token: this.token,
      };

      if (params.mediaType === "CAROUSEL") {
        queryParams.media_type = "CAROUSEL";
        if (params.children?.length) {
          queryParams.children = params.children.join(",");
        }
      } else if (params.mediaType === "REELS" && params.videoUrl) {
        queryParams.media_type = "REELS";
        queryParams.video_url = params.videoUrl;
        if (params.shareToFeed) queryParams.share_to_feed = "true";
      } else if (params.imageUrl) {
        queryParams.image_url = params.imageUrl;
        if (params.isCarouselItem) queryParams.is_carousel_item = "true";
      } else {
        throw new IGApiError(
          0,
          0,
          "Cần cung cấp imageUrl hoặc videoUrl để tạo container",
        );
      }

      if (params.caption) queryParams.caption = params.caption;

      try {
        const res = await this.http.post<{ id: string }>(
          `/${this.userId}/media`,
          null,
          { params: queryParams },
        );
        return res.data.id;
      } catch (err) {
        throw parseMetaError(err);
      }
    });
  }

  /**
   * Bước 3: Poll trạng thái container đến khi FINISHED hoặc lỗi
   * GET /{container_id}?fields=status,status_code
   */
  async pollContainerStatus(containerId: string): Promise<IGContainerStatus> {
    const deadline = Date.now() + CONTAINER_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      try {
        const res = await this.http.get(`/${containerId}`, {
          params: {
            fields: "status,status_code",
            access_token: this.token,
          },
        });
        const status: IGContainerStatus =
          res.data.status_code ?? res.data.status;

        if (status === "FINISHED") return "FINISHED";
        if (status === "ERROR" || status === "EXPIRED") {
          throw new IGApiError(0, 0, `Container status: ${status}`);
        }
      } catch (err) {
        if (err instanceof IGApiError) throw err;
        throw parseMetaError(err);
      }

      await sleep(CONTAINER_POLL_INTERVAL_MS);
    }

    throw new IGApiError(0, 0, "Timeout chờ container sẵn sàng");
  }

  /**
   * Bước 4: Publish container đã FINISHED
   * POST /{IG_USER_ID}/media_publish?creation_id=...
   */
  async publishContainer(containerId: string): Promise<string> {
    return withRetry(async () => {
      try {
        const res = await this.http.post<{ id: string }>(
          `/${this.userId}/media_publish`,
          null,
          {
            params: {
              creation_id: containerId,
              access_token: this.token,
            },
          },
        );
        return res.data.id;
      } catch (err) {
        throw parseMetaError(err);
      }
    });
  }

  /**
   * Full publish flow: quota check → tạo container → poll → publish → đọc lại media
   *
   * @param params - IGPublishParams
   * @returns IGPublishResult
   */
  async publish(params: IGPublishParams): Promise<IGPublishResult> {
    // 1. Kiểm tra quota
    const limit = await this.getPublishingLimit();
    if (limit.quotaUsage >= limit.quotaTotal) {
      throw new IGApiError(
        0,
        0,
        `Đã đạt giới hạn đăng bài: ${limit.quotaUsage}/${limit.quotaTotal} trong 24h`,
      );
    }

    // 2. Tạo container
    const containerId = await this.createMediaContainer(params);

    // 3. Poll đến FINISHED
    await this.pollContainerStatus(containerId);

    // 4. Publish
    const mediaId = await this.publishContainer(containerId);

    // 5. Đọc lại media để lấy permalink
    let permalink: string | null = null;
    try {
      const media = await this.getMedia(mediaId);
      permalink = media.permalink;
    } catch {
      // không critical nếu không đọc được permalink
    }

    return {
      containerId,
      mediaId,
      permalink,
      timestamp: new Date().toISOString(),
    };
  }

  // ------------------------------------------------------------------
  // SECTION 6: COMMENTS
  // ------------------------------------------------------------------

  /**
   * Lấy danh sách comments của một media
   * GET /{IG_MEDIA_ID}/comments?fields=...
   */
  async getMediaComments(mediaId: string, limit = 25): Promise<IGComment[]> {
    try {
      const res = await this.http.get(`/${mediaId}/comments`, {
        params: {
          fields: "id,text,timestamp,username,like_count,replies_count,hidden",
          limit,
          access_token: this.token,
        },
      });
      return (res.data.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        text: (c.text as string) ?? "",
        timestamp: c.timestamp as string,
        username: (c.username as string) ?? null,
        likeCount: (c.like_count as number) ?? 0,
        repliesCount: (c.replies_count as number) ?? 0,
        hidden: Boolean(c.hidden),
      }));
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Reply vào một comment (top-level)
   * POST /{IG_COMMENT_ID}/replies?message=...
   */
  async replyToComment(commentId: string, message: string): Promise<string> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/${commentId}/replies`,
        null,
        {
          params: { message, access_token: this.token },
        },
      );
      return res.data.id;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Ẩn hoặc hiện comment
   * POST /{IG_COMMENT_ID}?hide=true/false
   */
  async hideComment(commentId: string, hide: boolean): Promise<boolean> {
    try {
      const res = await this.http.post(`/${commentId}`, null, {
        params: {
          hide: hide ? "true" : "false",
          access_token: this.token,
        },
      });
      return res.data.success ?? true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Xóa một comment (chỉ được xóa comment trên media của mình)
   * DELETE /{IG_COMMENT_ID}
   */
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const res = await this.http.delete(`/${commentId}`, {
        params: { access_token: this.token },
      });
      return res.data.success ?? true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Đăng comment mới lên media của mình
   * POST /{IG_MEDIA_ID}/comments?message=...
   */
  async createComment(mediaId: string, message: string): Promise<string> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/${mediaId}/comments`,
        null,
        {
          params: { message, access_token: this.token },
        },
      );
      return res.data.id;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 7: INSIGHTS
  // ------------------------------------------------------------------

  /**
   * Lấy insights của một media (likes, comments, reach, views, v.v.)
   * GET /{IG_MEDIA_ID}/insights?metric=...
   *
   * Metrics khả dụng phụ thuộc vào media_product_type:
   *   FEED/REEL: likes, comments, saved, shares, reach, views, plays, total_interactions
   *   STORY: không dùng endpoint này
   */
  async getMediaInsights(
    mediaId: string,
    metrics?: string[],
  ): Promise<IGMediaInsights> {
    const defaultMetrics = [
      "likes",
      "comments",
      "saved",
      "shares",
      "reach",
      "views",
      "plays",
      "total_interactions",
    ];
    const metricList = (metrics ?? defaultMetrics).join(",");

    try {
      const res = await this.http.get(`/${mediaId}/insights`, {
        params: {
          metric: metricList,
          access_token: this.token,
        },
      });

      const raw: Array<{ name: string; values: Array<{ value: number }> }> =
        res.data.data ?? [];
      const map: Record<string, number> = {};
      for (const item of raw) {
        map[item.name] = item.values?.[0]?.value ?? 0;
      }

      return {
        likes: map.likes ?? 0,
        comments: map.comments ?? 0,
        saved: map.saved ?? 0,
        shares: map.shares ?? 0,
        reach: map.reach ?? 0,
        views: map.views ?? 0,
        plays: map.plays ?? 0,
        totalInteractions: map.total_interactions ?? 0,
        _raw: raw,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Lấy insights cấp tài khoản (follower count, reach, views)
   * GET /{IG_USER_ID}/insights?metric=...&period=day|week|month
   *
   * Lưu ý: follower_count chỉ có cho tài khoản >= 100 followers
   */
  async getAccountInsights(
    metrics: string[] = ["follower_count", "reach", "views"],
    period: "day" | "week" | "month" = "day",
  ): Promise<IGAccountInsights> {
    try {
      const res = await this.http.get(`/${this.userId}/insights`, {
        params: {
          metric: metrics.join(","),
          period,
          access_token: this.token,
        },
      });

      const raw: Array<{
        name: string;
        period: string;
        values: Array<{ value: number; end_time: string }>;
      }> = res.data.data ?? [];

      const map: Record<string, number> = {};
      for (const item of raw) {
        const latest = item.values?.[item.values.length - 1];
        map[item.name] = latest?.value ?? 0;
      }

      return {
        followerCount: map.follower_count ?? 0,
        reach: map.reach ?? 0,
        views: map.views ?? 0,
        period,
        _raw: raw,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }
}

// Singleton export
export const instagramService = new InstagramService();
