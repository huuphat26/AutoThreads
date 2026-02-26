// ============================================================
// AUTO THREADS - Threads Meta API Service (Personal Use)
// Tài liệu: https://developers.facebook.com/docs/threads/reference
// ============================================================
import axios, { AxiosInstance, AxiosError } from "axios";
import type {
  ThreadsUser,
  ThreadsContainerStatusResult,
  ThreadsContainerStatus,
  ThreadsPost,
  ThreadsPostInsights,
  ThreadsPublishingLimit,
  ThreadsTokenInfo,
  ThreadsTokenResult,
  ThreadsPublishFlow,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────
const BASE_URL = "https://graph.threads.net/v1.0";

/** Thời gian tối đa chờ container sẵn sàng (ms) */
const CONTAINER_POLL_TIMEOUT_MS = 30_000;
/** Interval poll trạng thái container (ms) */
const CONTAINER_POLL_INTERVAL_MS = 3_000;

// ─── Lỗi custom ───────────────────────────────────────────────
export class ThreadsApiError extends Error {
  constructor(
    public readonly code: number,
    public readonly subcode: number,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = "ThreadsApiError";
  }
}

// ─── Helper: parse lỗi từ Meta ────────────────────────────────
function parseMetaError(err: unknown): ThreadsApiError {
  if (err instanceof AxiosError && err.response?.data?.error) {
    const e = err.response.data.error as {
      message: string;
      code: number;
      error_subcode?: number;
    };
    return new ThreadsApiError(
      e.code,
      e.error_subcode ?? 0,
      `[Meta ${e.code}] ${e.message}`,
      err.response.data,
    );
  }
  if (err instanceof Error) return new ThreadsApiError(0, 0, err.message, err);
  return new ThreadsApiError(0, 0, String(err));
}

// ─── Sleep helper ─────────────────────────────────────────────
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── THREADS SERVICE ──────────────────────────────────────────
class ThreadsService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({ baseURL: BASE_URL, timeout: 15_000 });
  }

  // ------------------------------------------------------------------
  // SECTION 1: CONFIG & CREDENTIALS
  // ------------------------------------------------------------------

  private get token(): string {
    const t = process.env.THREADS_ACCESS_TOKEN;
    if (!t) throw new Error("THREADS_ACCESS_TOKEN chưa cấu hình trong .env");
    return t;
  }

  private get userId(): string {
    const id = process.env.THREADS_USER_ID;
    if (!id) throw new Error("THREADS_USER_ID chưa cấu hình trong .env");
    return id;
  }

  private get appId(): string {
    const id = process.env.THREADS_APP_ID;
    if (!id) throw new Error("THREADS_APP_ID chưa cấu hình trong .env");
    return id;
  }

  private get appSecret(): string {
    const s = process.env.THREADS_APP_SECRET;
    if (!s) throw new Error("THREADS_APP_SECRET chưa cấu hình trong .env");
    return s;
  }

  // ------------------------------------------------------------------
  // SECTION 2: TOKEN MANAGEMENT
  // ──────────────────────────────────────────────────────────────────
  // Token Threads có 2 loại:
  //   - Short-lived: 1 giờ (lấy qua Authorization Window)
  //   - Long-lived : 60 ngày (exchange từ short, có thể refresh)
  // ------------------------------------------------------------------

  /**
   * Đổi short-lived token → long-lived token (60 ngày)
   * Gọi từ server-side, KHÔNG bao giờ gọi từ client
   *
   * @param shortToken - Short-lived access token (1 giờ)
   * @returns Long-lived token + thời hạn
   */
  async exchangeForLongLivedToken(
    shortToken: string,
  ): Promise<ThreadsTokenResult> {
    try {
      const res = await this.http.get<ThreadsTokenResult>("/access_token", {
        params: {
          grant_type: "th_exchange_token",
          client_secret: this.appSecret,
          access_token: shortToken,
        },
      });
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Refresh long-lived token trước khi hết hạn
   * Token phải còn hạn (không thể refresh token đã expire)
   * Token hợp lệ sau khi refresh: 60 ngày mới
   *
   * Nên gọi tự động mỗi 30 ngày để tránh token hết hạn
   */
  async refreshLongLivedToken(): Promise<ThreadsTokenResult> {
    try {
      const res = await this.http.get<ThreadsTokenResult>(
        "/refresh_access_token",
        {
          params: {
            grant_type: "th_refresh_token",
            access_token: this.token,
          },
        },
      );
      console.log(
        `[ThreadsService] Token refreshed. Expires in: ${Math.round(res.data.expires_in / 86400)} ngày`,
      );
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Debug token: xem thông tin chi tiết, ngày hết hạn, permissions
   * Dùng endpoint GET /debug_token của Meta Graph API
   */
  async debugToken(): Promise<ThreadsTokenInfo> {
    try {
      const res = await this.http.get<{ data: ThreadsTokenInfo }>(
        "https://graph.threads.net/debug_token",
        {
          params: {
            input_token: this.token,
            access_token: `${this.appId}|${this.appSecret}`,
          },
        },
      );
      return res.data.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Kiểm tra token còn hạn không và trả về ngày hết hạn
   */
  async getTokenStatus(): Promise<{
    isValid: boolean;
    expiresAt: Date | null;
    daysLeft: number;
    scopes: string[];
    username: string;
  }> {
    try {
      const info = await this.debugToken();
      const expiresAt =
        info.expires_at > 0 ? new Date(info.expires_at * 1000) : null;
      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000)
        : -1;
      return {
        isValid: info.is_valid,
        expiresAt,
        daysLeft,
        scopes: info.scopes,
        username: "",
      };
    } catch {
      return {
        isValid: false,
        expiresAt: null,
        daysLeft: -1,
        scopes: [],
        username: "",
      };
    }
  }

  // ------------------------------------------------------------------
  // SECTION 3: ACCOUNT / PROFILE
  // ------------------------------------------------------------------

  /**
   * Xác thực tài khoản: lấy thông tin profile của bạn
   * Gọi đầu tiên để kiểm tra token hoạt động
   */
  async getMyProfile(): Promise<ThreadsUser> {
    try {
      const res = await this.http.get<ThreadsUser>("/me", {
        params: {
          fields:
            "id,username,name,biography,followers_count,threads_profile_picture_url",
          access_token: this.token,
        },
      });
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Ping đơn giản — verify token còn sống không
   * false nếu token hết hạn hoặc cấu hình sai
   */
  async verifyCredentials(): Promise<{
    ok: boolean;
    userId: string;
    username: string;
    error?: string;
  }> {
    try {
      const profile = await this.getMyProfile();
      return { ok: true, userId: profile.id, username: profile.username };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, userId: "", username: "", error: msg };
    }
  }

  // ------------------------------------------------------------------
  // SECTION 4: PUBLISHING — Text Posts
  // ──────────────────────────────────────────────────────────────────
  // Flow theo Meta API:
  //   1. POST /{user-id}/threads  → tạo container → trả về container ID
  //   2. Poll GET /{container-id}?fields=status,error_message
  //      cho đến khi status = FINISHED (hoặc ERROR/EXPIRED)
  //   3. POST /{user-id}/threads_publish  → publish → trả về post ID
  // ------------------------------------------------------------------

  /**
   * Bước 1: Tạo TEXT media container
   * Trả về container ID để dùng ở bước 3
   */
  async createTextContainer(text: string): Promise<string> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/${this.userId}/threads`,
        null,
        {
          params: {
            media_type: "TEXT",
            text,
            access_token: this.token,
          },
        },
      );
      return res.data.id;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Bước 2: Poll trạng thái container cho đến khi FINISHED hoặc lỗi
   * Meta cần thời gian xử lý trước khi cho phép publish
   *
   * @throws ThreadsApiError nếu container ERROR, EXPIRED hoặc timeout
   */
  async waitForContainerReady(containerId: string): Promise<void> {
    const deadline = Date.now() + CONTAINER_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const status = await this.getContainerStatus(containerId);

      if (status.status === "FINISHED") return;

      if (status.status === "ERROR") {
        throw new ThreadsApiError(
          0,
          0,
          `Container lỗi: ${status.error_message ?? "Không rõ nguyên nhân"}`,
        );
      }

      if (status.status === "EXPIRED") {
        throw new ThreadsApiError(0, 0, "Container đã hết hạn (EXPIRED)");
      }

      // IN_PROGRESS → đợi tiếp
      await sleep(CONTAINER_POLL_INTERVAL_MS);
    }

    throw new ThreadsApiError(0, 0, "Container không sẵn sàng sau 30 giây");
  }

  /**
   * Kiểm tra trạng thái container publishing
   * GET /{container-id}?fields=id,status,error_message
   */
  async getContainerStatus(
    containerId: string,
  ): Promise<ThreadsContainerStatusResult> {
    try {
      const res = await this.http.get<ThreadsContainerStatusResult>(
        `/${containerId}`,
        {
          params: {
            fields: "id,status,error_message",
            access_token: this.token,
          },
        },
      );
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Bước 3: Publish container đã sẵn sàng
   * POST /{user-id}/threads_publish
   */
  async publishContainer(containerId: string): Promise<string> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/${this.userId}/threads_publish`,
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
  }

  /**
   * **Full publish flow** — đăng text post lên Threads
   * Tự động: tạo container → poll status → publish → trả kết quả
   *
   * Luôn kiểm tra rate limit trước khi đăng.
   *
   * @param text - Nội dung đầy đủ (tối đa 500 ký tự)
   * @returns ThreadsPublishFlow với postId và thông tin quota
   */
  async publishTextPost(text: string): Promise<ThreadsPublishFlow> {
    // [0] Kiểm tra quota trước để tránh lãng phí container
    const limit = await this.getPublishingLimit();
    const remaining = limit.config.quota_total - limit.quota_usage;

    if (remaining <= 0) {
      throw new ThreadsApiError(
        32,
        0,
        `Rate limit: đã dùng ${limit.quota_usage}/${limit.config.quota_total} bài trong 24h. Vui lòng thử lại sau.`,
      );
    }

    // [1] Tạo container
    const containerId = await this.createTextContainer(text);
    console.log(`[ThreadsService] Container tạo: ${containerId}`);

    // [2] Đợi container FINISHED
    await this.waitForContainerReady(containerId);
    console.log(`[ThreadsService] Container sẵn sàng: ${containerId}`);

    // [3] Publish
    const postId = await this.publishContainer(containerId);
    const postedAt = new Date().toISOString();
    console.log(`[ThreadsService] ✅ Đăng thành công! Post ID: ${postId}`);

    // [4] Lấy lại quota sau khi đăng
    const updatedLimit = await this.getPublishingLimit();

    return {
      containerId,
      postId,
      postedAt,
      quotaUsed: updatedLimit.quota_usage,
      quotaRemaining:
        updatedLimit.config.quota_total - updatedLimit.quota_usage,
    };
  }

  // ------------------------------------------------------------------
  // SECTION 5: BÀI ĐĂNG — Lấy, xóa, repost
  // ------------------------------------------------------------------

  /**
   * Lấy chi tiết một bài đăng theo ID
   */
  async getPost(postId: string): Promise<ThreadsPost> {
    try {
      const res = await this.http.get<ThreadsPost>(`/${postId}`, {
        params: {
          fields:
            "id,text,timestamp,media_type,media_url,permalink,shortcode,thumbnail_url,has_replies,hide_status,reply_audience,is_quote_post",
          access_token: this.token,
        },
      });
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Lấy danh sách bài đăng gần đây của tài khoản bạn
   *
   * @param limit - Số bài lấy (mặc định 10, tối đa 100)
   */
  async getMyPosts(
    limit = 10,
  ): Promise<{
    data: ThreadsPost[];
    paging?: { cursors: { before: string; after: string }; next?: string };
  }> {
    try {
      const res = await this.http.get(`/${this.userId}/threads`, {
        params: {
          fields:
            "id,text,timestamp,media_type,permalink,shortcode,has_replies,hide_status",
          limit,
          access_token: this.token,
        },
      });
      return res.data;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Xóa bài đăng (DELETE /{media-id})
   * Chỉ xóa được bài của chính mình
   *
   * @returns true nếu xóa thành công
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      const res = await this.http.delete<{ success: boolean }>(`/${postId}`, {
        params: { access_token: this.token },
      });
      return res.data.success === true;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Repost một bài đăng đã publish (POST /{media-id}/repost)
   *
   * @returns ID của repost mới
   */
  async repost(mediaId: string): Promise<string> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/${mediaId}/repost`,
        null,
        { params: { access_token: this.token } },
      );
      return res.data.id;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 6: INSIGHTS — Thống kê bài đăng
  // ------------------------------------------------------------------

  /**
   * Lấy thống kê engagement của một bài đăng
   * Cần quyền threads_manage_insights
   *
   * Metrics: views, likes, replies, reposts, quotes
   */
  async getPostInsights(postId: string): Promise<ThreadsPostInsights> {
    try {
      const res = await this.http.get<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(`/${postId}/insights`, {
        params: {
          metric: "views,likes,replies,reposts,quotes",
          access_token: this.token,
        },
      });

      const result: ThreadsPostInsights = {};
      for (const metric of res.data.data) {
        const value = metric.values?.[0]?.value ?? 0;
        (result as Record<string, number>)[metric.name] = value;
      }
      return result;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Lấy thống kê tổng cho tài khoản (follower, engagement tổng...)
   */
  async getAccountInsights(
    period: "day" | "week" | "month" = "day",
  ): Promise<Record<string, number>> {
    try {
      const res = await this.http.get<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(`/${this.userId}/threads_insights`, {
        params: {
          metric: "views,likes,replies,reposts,quotes,followers_count",
          period,
          access_token: this.token,
        },
      });

      const result: Record<string, number> = {};
      for (const metric of res.data.data) {
        result[metric.name] = metric.values?.[0]?.value ?? 0;
      }
      return result;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  // ------------------------------------------------------------------
  // SECTION 7: RATE LIMIT — Giới hạn đăng bài
  // ------------------------------------------------------------------

  /**
   * Kiểm tra quota đăng bài trong 24h
   *
   * Meta giới hạn mặc định 250 bài đăng/24h cho personal use.
   * GET /{user-id}/threads_publishing_limit
   */
  async getPublishingLimit(): Promise<ThreadsPublishingLimit> {
    try {
      const res = await this.http.get<{
        data: Array<{
          config: { quota_total: number; quota_duration: number };
          quota_usage: number;
        }>;
      }>(`/${this.userId}/threads_publishing_limit`, {
        params: {
          fields: "config,quota_usage",
          access_token: this.token,
        },
      });

      const record = res.data.data?.[0];
      if (!record) {
        // Fallback nếu Meta chưa trả data
        return {
          config: { quota_total: 250, quota_duration: 86400 },
          quota_usage: 0,
        };
      }
      return record;
    } catch (err) {
      throw parseMetaError(err);
    }
  }

  /**
   * Tóm tắt nhanh: còn bao nhiêu bài được phép đăng trong 24h
   */
  async getRemainingQuota(): Promise<{
    used: number;
    total: number;
    remaining: number;
    resetInHours: number;
  }> {
    const limit = await this.getPublishingLimit();
    return {
      used: limit.quota_usage,
      total: limit.config.quota_total,
      remaining: limit.config.quota_total - limit.quota_usage,
      resetInHours: Math.round(limit.config.quota_duration / 3600),
    };
  }
}

// ─── Singleton export ──────────────────────────────────────────
// Dùng một instance duy nhất trong toàn app
export const threadsService = new ThreadsService();
export type { ThreadsService };
