import axios, { AxiosError, type AxiosInstance } from "axios";
import type {
  FBPage,
  FBPost,
  FBComment,
  FBPostEngagement,
  FBReactionSummary,
  FBPostInsights,
  FBPageInsights,
  FBTokenStatus,
  FBAttachment,
} from "@/types";

const BASE_URL = "https://graph.facebook.com/v25.0";

export class FBApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly subcode: number,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "FBApiError";
  }
}

function parseMetaError(err: unknown): FBApiError {
  if (err instanceof AxiosError && err.response?.data?.error) {
    const e = err.response.data.error as {
      message: string;
      code: number;
      error_subcode?: number;
    };
    return new FBApiError(
      e.code,
      e.error_subcode ?? 0,
      `[Meta ${e.code}] ${e.message}`,
      err.response.data,
    );
  }
  if (err instanceof Error) return new FBApiError(0, 0, err.message, err);
  return new FBApiError(0, 0, String(err));
}

// ─── Result Types (khuyến nghị) ────────────────────────────────
export type FBPublishResult =
  | {
      kind: "post";
      postId: string;
      permalink: string | null;
      timestamp: string;
    }
  | {
      kind: "photo";
      postId: string;
      photoId: string;
      permalink: string | null;
      timestamp: string;
    }
  | {
      kind: "video";
      videoId: string;
      permalink: string | null;
      timestamp: string;
    };

// ─── Facebook Service ──────────────────────────────────────────
class FacebookService {
  private http: AxiosInstance;
  /** Scoped page ID resolved from the Page Access Token (not the global FB_PAGE_ID). */
  private _resolvedPageId: string | null = null;
  private _resolvedPageToken: string | null = null;
  private _overridePageToken?: string;
  private _overridePageId?: string;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 20_000 });
  }

  /** Tạo instance mới với credentials override (multi-account) */
  withCredentials(pageToken: string, pageId: string): FacebookService {
    const svc = new FacebookService();
    svc._overridePageToken = pageToken;
    svc._overridePageId = pageId;
    return svc;
  }

  /**
   * Trả về scoped page ID bằng cách gọi GET /me?fields=id với Page Access Token.
   * Kết quả được cache cho toàn bộ vòng đời của service instance.
   *
   * Lý do cần hàm này:
   *   FB_PAGE_ID trong .env là Global Page ID (NPE). Nhiều Graph API endpoint
   *   từ chối Global ID với lỗi #100. Gọi /me với page token trả về scoped ID
   *   (dạng số khác) mà API chấp nhận cho tất cả post/insights call.
   */
  private async resolvePageId(): Promise<string> {
    const currentToken = this.pageToken;
    if (
      this._resolvedPageId &&
      this._resolvedPageToken &&
      this._resolvedPageToken === currentToken
    ) {
      return this._resolvedPageId;
    }

    // Token đã đổi (hoặc chưa cache) -> bỏ scoped ID cũ để tránh dính account trước.
    this._resolvedPageId = null;
    this._resolvedPageToken = currentToken;

    try {
      const res = await this.http.get("/me", {
        params: { fields: "id", access_token: currentToken },
      });
      this._resolvedPageId = String(res.data.id);
      console.log(
        `[FB Service] ✅ Scoped page ID: ${this._resolvedPageId} (env: ${this.pageId})`,
      );
      return this._resolvedPageId;
    } catch {
      // fallback to env value — may still fail with #100 for NPE pages
      return this.pageId;
    }
  }

  // ------------------------------------------------------------------
  // SECTION 1: CONFIG
  // ------------------------------------------------------------------

  /** Page Access Token — dùng cho tất cả post/insights trên page */
  private get pageToken(): string {
    if (this._overridePageToken) return this._overridePageToken;
    const t = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!t) throw new Error("FB_PAGE_ACCESS_TOKEN chưa cấu hình trong .env");
    return t.trim();
  }

  private get pageId(): string {
    if (this._overridePageId) return this._overridePageId;
    const id = process.env.FB_PAGE_ID;
    if (!id) throw new Error("FB_PAGE_ID chưa cấu hình trong .env");
    return id.trim();
  }

  private get appId(): string | undefined {
    return process.env.FB_APP_ID?.trim();
  }

  private get appSecret(): string | undefined {
    return process.env.FB_APP_SECRET?.trim();
  }

  /** Helper: thêm access_token vào params (đúng cách, không set undefined) */
  private withToken(
    params: Record<string, unknown> = {},
    usePageToken = true,
  ): Record<string, unknown> {
    return {
      ...params,
      ...(usePageToken ? { access_token: this.pageToken } : {}),
    };
  }

  /**
   * Chuẩn hoá Page Post ID.
   * @param maybeId  - ID trả về từ API (có thể là plain số hoặc đã có dạng X_Y)
   * @param scopedId - Scoped page ID đã resolve (truyền vào để tránh gọi /me lại)
   */
  private normalizePagePostId(maybeId: string, scopedId?: string): string {
    const s = String(maybeId);
    if (s.includes("_")) return s;
    // Ghép với scoped ID (ưu tiên) hoặc env page ID (fallback)
    const prefix = scopedId ?? this.pageId;
    if (/^\d+$/.test(s)) return `${prefix}_${s}`;
    return s;
  }

  // ------------------------------------------------------------------
  // SECTION 2: TOKEN
  // ------------------------------------------------------------------

  async getTokenStatus(): Promise<FBTokenStatus> {
    const appId = this.appId;
    const appSecret = this.appSecret;

    if (!appId || !appSecret) {
      return {
        isValid: true,
        expiresAt: null,
        daysLeft: null,
        scopes: [],
        appId: null,
        type: null,
      };
    }

    try {
      const res = await this.http.get("/debug_token", {
        params: {
          input_token: this.pageToken,
          access_token: `${appId}|${appSecret}`,
        },
      });

      const d = res.data.data;
      const expiresAt = d.expires_at ? new Date(d.expires_at * 1000) : null;
      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
        : null;

      // debug_token trả về is_valid=false với error 190 khi token là User Token
      // (không có page permissions). Verify thực tế bằng cách gọi /me.
      const debugError = d.error as { code?: number } | undefined;
      const isPagePermError = !d.is_valid && debugError?.code === 190;

      if (isPagePermError) {
        try {
          const meRes = await this.http.get("/me", {
            params: { fields: "id,name", access_token: this.pageToken },
          });
          // Token hoạt động được với /me → token hợp lệ, chỉ thiếu page perms
          const isActuallyValid = !!meRes.data?.id;
          return {
            isValid: isActuallyValid,
            expiresAt: expiresAt?.toISOString() ?? null,
            daysLeft,
            scopes: d.scopes ?? [],
            appId: d.app_id ?? appId,
            type: d.type ?? "USER",
            // Truyền thêm cảnh báo để UI hiển thị
          };
        } catch {
          // /me cũng thất bại → token thực sự hết hạn
        }
      }

      return {
        isValid: d.is_valid ?? false,
        expiresAt: expiresAt?.toISOString() ?? null,
        daysLeft,
        scopes: d.scopes ?? [],
        appId: d.app_id ?? appId,
        type: d.type ?? null,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 3: PAGE PROFILE
  // ------------------------------------------------------------------

  async getPage(pageId?: string): Promise<FBPage> {
    const configuredId = pageId ?? this.pageId;
    try {
      const res = await this.http.get(`/${configuredId}`, {
        params: this.withToken({ fields: "id,name,link,picture,fan_count,followers_count" }, true),
      });
      const d = res.data;
      return {
        id: d.id,
        name: d.name,
        fanCount: d.fan_count || 0,
        followersCount: d.followers_count || 0,
        link: d.link ?? null,
        pictureUrl: d.picture?.data?.url ?? null,
        category: null,
        about: null,
        website: null,
      };
    } catch (err) {
      const parsed = parseMetaError(err);
      // Error 190/10: token có thể vẫn hợp lệ nhưng không đủ quyền đọc Page metadata.
      // Fallback: lấy profile cá nhân qua /me để dashboard vẫn hiển thị được.
      if (parsed.code === 190 || parsed.code === 10) {
        // Nếu page ID cấu hình không khớp token hiện tại, thử scoped page ID trước.
        try {
          const resolvedId = await this.resolvePageId();
          const pageRes = await this.http.get(`/${resolvedId}`, {
            params: this.withToken({ fields: "id,name,link,picture,fan_count,followers_count" }, true),
          });
          const d = pageRes.data;
          return {
            id: d.id,
            name: d.name,
            fanCount: d.fan_count || 0,
            followersCount: d.followers_count || 0,
            link: d.link ?? null,
            pictureUrl: d.picture?.data?.url ?? null,
            category: null,
            about: null,
            website: null,
          };
        } catch {
          // fallback tiếp theo: /me
        }

        try {
          const meRes = await this.http.get("/me", {
            params: {
              fields: "id,name,link,picture",
              access_token: this.pageToken,
            },
          });
          const d = meRes.data;
          return {
            id: d.id,
            name: d.name ?? "Facebook Profile",
            fanCount: 0,
            followersCount: 0,
            link: d.link ?? `https://facebook.com/${d.id}`,
            pictureUrl: d.picture?.data?.url ?? null,
            category: "Personal Profile",
            about: null,
            website: null,
          };
        } catch {
          // /me cũng thất bại → throw lỗi gốc
        }
      }
      throw parsed;
    }
  }

  // ------------------------------------------------------------------
  // SECTION 4: POSTS — List & Read
  // ------------------------------------------------------------------

  /**
   * Lấy danh sách bài đăng trên page
   * GET /{PAGE_ID}/posts?fields=...
   */
  async getPosts(
    limit = 10,
    after?: string,
  ): Promise<{
    data: FBPost[];
    paging: { next?: string; cursors?: { before: string; after: string } };
  }> {
    try {
      const pageId = this.pageId;
      const params: Record<string, unknown> = {
        fields:
          "id,message,story,created_time,permalink_url,full_picture,attachments,likes.summary(true),comments.summary(true),shares",
        limit,
        access_token: this.pageToken,
      };
      if (after) params.after = after;

      const res = await this.http.get(`/${pageId}/posts`, { params });
      const data: FBPost[] = (res.data.data ?? []).map(
        (item: Record<string, unknown>) => this.mapPost(item),
      );
      return { data, paging: res.data.paging ?? {} };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /** Lấy chi tiết một bài đăng */
  async getPost(postId: string): Promise<FBPost> {
    try {
      const normalized = this.normalizePagePostId(postId, this.pageId);
      const res = await this.http.get(`/${normalized}`, {
        params: this.withToken({
          fields:
            "id,message,story,created_time,permalink_url,full_picture,attachments,likes.summary(true),comments.summary(true),shares",
        }),
      });
      return this.mapPost(res.data);
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  private mapPost(item: Record<string, unknown>): FBPost {
    const attachmentData =
      (item.attachments as { data?: unknown[] } | null)?.data ?? [];

    const attachments: FBAttachment[] = attachmentData.map((a: unknown) => {
      const att = a as Record<string, unknown>;
      const media = att.media as Record<string, unknown> | null;
      const image = media?.image as Record<string, unknown> | null;
      return {
        type: (att.type as string) ?? "unknown",
        title: (att.title as string) ?? null,
        description: (att.description as string) ?? null,
        url: (att.unshimmed_url as string) ?? null,
        mediaUrl: (image?.src as string) ?? null,
      };
    });

    const likes = item.likes as { summary?: { total_count?: number } } | null;
    const comments = item.comments as {
      summary?: { total_count?: number };
    } | null;
    const shares = item.shares as { count?: number } | null;

    return {
      id: item.id as string,
      message: (item.message as string) ?? null,
      story: (item.story as string) ?? null,
      createdTime: item.created_time as string,
      permalinkUrl: (item.permalink_url as string) ?? null,
      fullPicture: (item.full_picture as string) ?? null,
      attachments: attachments.length ? attachments : null,
      likesCount: likes?.summary?.total_count ?? 0,
      commentsCount: comments?.summary?.total_count ?? 0,
      sharesCount: shares?.count ?? 0,
    };
  }

  // ------------------------------------------------------------------
  // SECTION 5: PUBLISHING (FIXED)
  // ------------------------------------------------------------------

  /**
   * Đăng bài text thuần lên Page Feed
   * POST /{scoped_page_id}/feed
   */
  async publishText(message: string): Promise<FBPublishResult> {
    try {
      const pageId = this.pageId;
      const res = await this.http.post(
        `/${pageId}/feed`,
        new URLSearchParams({ message, access_token: this.pageToken }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      const postId = this.normalizePagePostId(String(res.data.id), pageId);
      const detail = await this.safeGetPostForPermalink(postId);

      return {
        kind: "post",
        postId,
        permalink: detail?.permalinkUrl ?? null,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Đăng ảnh: upload unpublished photo → tạo feed post kèm attached_media.
   * Dùng scoped page ID (tránh lỗi #100 với Global/NPE page ID).
   */
  async publishPhoto(
    imageUrl: string,
    caption?: string,
  ): Promise<FBPublishResult> {
    try {
      const pageId = this.pageId;

      // 1) Upload ảnh ở chế độ unpublished → lấy photo object ID
      const up = await this.http.post(
        `/${pageId}/photos`,
        new URLSearchParams({
          url: imageUrl,
          published: "false",
          access_token: this.pageToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      const photoId = String(up.data.id);

      // 2) Tạo post feed kèm ảnh đã upload
      const body = new URLSearchParams({ access_token: this.pageToken });
      if (caption) body.append("message", caption);
      body.append("attached_media[0]", JSON.stringify({ media_fbid: photoId }));

      const feed = await this.http.post(`/${pageId}/feed`, body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const postId = this.normalizePagePostId(String(feed.data.id), pageId);
      const detail = await this.safeGetPostForPermalink(postId);

      return {
        kind: "photo",
        postId,
        photoId,
        permalink: detail?.permalinkUrl ?? null,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Upload video lên page (dùng scoped page ID).
   */
  async publishVideo(
    videoUrl: string,
    description?: string,
  ): Promise<FBPublishResult> {
    try {
      const pageId = this.pageId;
      const body: Record<string, string> = {
        file_url: videoUrl,
        access_token: this.pageToken,
      };
      if (description) body.description = description;

      const res = await this.http.post(
        `/${pageId}/videos`,
        new URLSearchParams(body),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );

      return {
        kind: "video",
        videoId: String(res.data.id),
        permalink: null,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Xóa bài đăng (chỉ dùng khi bạn có postId thật)
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      const normalized = this.normalizePagePostId(postId, this.pageId);
      const res = await this.http.delete(`/${normalized}`, {
        params: this.withToken(),
      });
      return res.data.success === true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /** an toàn: lấy permalink nếu được, fail thì thôi */
  private async safeGetPostForPermalink(
    postId: string,
  ): Promise<FBPost | null> {
    try {
      return await this.getPost(postId);
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // SECTION 6: ENGAGEMENT & REACTIONS
  // ------------------------------------------------------------------

  async getPostEngagement(postId: string): Promise<FBPostEngagement> {
    try {
      const normalized = this.normalizePagePostId(postId, this.pageId);
      const res = await this.http.get(`/${normalized}`, {
        params: {
          fields:
            "shares,likes.summary(true),comments.summary(true),reactions.summary(true)",
          access_token: this.pageToken,
        },
      });
      const d = res.data;
      const likes = d?.likes?.summary?.total_count ?? 0;
      const commentsCount = d?.comments?.summary?.total_count ?? 0;
      const sharesCount = d?.shares?.count ?? 0;
      const reactionsCount = d?.reactions?.summary?.total_count ?? 0;

      const REACTION_TYPES: FBReactionSummary["type"][] = [
        "LIKE",
        "LOVE",
        "HAHA",
        "WOW",
        "SAD",
        "ANGRY",
        "CARE",
      ];
      const reactions: FBReactionSummary[] = await Promise.all(
        REACTION_TYPES.map(async (type) => {
          try {
            const r = await this.http.get(`/${normalized}/reactions`, {
              params: { type, summary: 1, access_token: this.pageToken },
            });
            return { type, totalCount: r.data.summary?.total_count ?? 0 };
          } catch {
            return { type, totalCount: 0 };
          }
        }),
      );

      return {
        postId: normalized,
        likesCount: likes,
        commentsCount,
        sharesCount,
        reactionsCount,
        reactions,
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  async getPostComments(postId: string, limit = 25): Promise<FBComment[]> {
    try {
      const normalized = this.normalizePagePostId(postId, this.pageId);
      const res = await this.http.get(`/${normalized}/comments`, {
        params: {
          fields: "id,message,created_time,from,like_count,can_hide,can_remove",
          limit,
          access_token: this.pageToken,
        },
      });
      return (res.data.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        message: (c.message as string) ?? "",
        createdTime: c.created_time as string,
        from: c.from as { id: string; name: string } | null,
        likeCount: (c.like_count as number) ?? 0,
        canHide: Boolean(c.can_hide),
        canRemove: Boolean(c.can_remove),
        parentId: null,
      }));
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  async replyToComment(commentId: string, message: string): Promise<string> {
    try {
      const res = await this.http.post(
        `/${commentId}/comments`,
        new URLSearchParams({ message, access_token: this.pageToken }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      return res.data.id as string;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  async hideComment(commentId: string, hide: boolean): Promise<boolean> {
    try {
      const res = await this.http.post(
        `/${commentId}`,
        new URLSearchParams({
          is_hidden: String(hide),
          access_token: this.pageToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      return res.data.success === true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const res = await this.http.delete(`/${commentId}`, {
        params: { access_token: this.pageToken },
      });
      return res.data.success === true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 7: INSIGHTS
  // ------------------------------------------------------------------

  async getPostInsights(postId: string): Promise<FBPostInsights> {
    const metricList = [
      "post_impressions",
      "post_impressions_unique",
      "post_impressions_paid",
      "post_engaged_users",
      "post_reactions_by_type_total",
      "post_clicks",
      "post_clicks_unique",
      "post_video_views",
    ].join(",");

    try {
      const normalized = this.normalizePagePostId(postId, this.pageId);
      const res = await this.http.get(`/${normalized}/insights`, {
        params: { metric: metricList, access_token: this.pageToken },
      });

      const raw: Array<{
        name: string;
        values: Array<{ value: number | Record<string, number> }>;
      }> = res.data.data ?? [];

      const getValue = (name: string): number => {
        const item = raw.find((m) => m.name === name);
        const v = item?.values?.[0]?.value;
        if (typeof v === "number") return v;
        if (typeof v === "object" && v !== null)
          return Object.values(v as Record<string, number>).reduce(
            (s, n) => s + n,
            0,
          );
        return 0;
      };

      return {
        impressions: getValue("post_impressions"),
        impressionsUnique: getValue("post_impressions_unique"),
        impressionsPaid: getValue("post_impressions_paid"),
        engagedUsers: getValue("post_engaged_users"),
        reactions: getValue("post_reactions_by_type_total"),
        clicks: getValue("post_clicks"),
        clicksUnique: getValue("post_clicks_unique"),
        videoViews: raw.some((m) => m.name === "post_video_views")
          ? getValue("post_video_views")
          : null,
        _raw: raw as FBPostInsights["_raw"],
      };
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  async getPageInsights(
    metrics: string[] = [
      "page_impressions",
      "page_impressions_unique",
      "page_engaged_users",
      "page_fan_adds",
      "page_post_engagements",
      "page_views_total",
    ],
    period: "day" | "week" | "month" = "day",
  ): Promise<FBPageInsights> {
    try {
      const res = await this.http.get(`/${this.pageId}/insights`, {
        params: {
          metric: metrics.join(","),
          period,
          access_token: this.pageToken,
        },
      });

      const raw: Array<{
        name: string;
        period: string;
        values: Array<{
          value: number | Record<string, number>;
          end_time: string;
        }>;
      }> = res.data.data ?? [];

      const metricsMap: Record<string, number> = {};
      for (const item of raw) {
        const last = item.values[item.values.length - 1]?.value;
        if (typeof last === "number") {
          metricsMap[item.name] = last;
        } else if (typeof last === "object" && last !== null) {
          metricsMap[item.name] = Object.values(
            last as Record<string, number>,
          ).reduce((s, n) => s + n, 0);
        }
      }
      return { period, metrics: metricsMap, _raw: raw };
    } catch (err) {
      throw parseMetaError(err);
    }
  }
}

export const facebookService = new FacebookService();
export type { FacebookService };
