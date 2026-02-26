// ============================================
// AUTO THREADS - TypeScript Types
// ============================================

export type PostStatus = "pending" | "posted" | "failed" | "draft";

export type PostSlot = "morning" | "noon" | "evening";

export type ContentTopic =
  | "detox" // Detox & thanh lọc cơ thể
  | "beauty" // Làm đẹp & sắc vóc
  | "recipe" // Công thức nước ép
  | "sales" // Bán hàng & giới thiệu sản phẩm
  | "community"; // Cộng đồng & tương tác

// ---- Threads Media Types ----
export type ThreadsMediaType = "TEXT" | "IMAGE" | "VIDEO" | "CAROUSEL";

// Container publishing status từ Meta API
export type ThreadsContainerStatus =
  | "EXPIRED"
  | "ERROR"
  | "FINISHED"
  | "IN_PROGRESS"
  | "PUBLISHED";

// ---- Threads API Core Types ----

export interface ThreadsUser {
  id: string;
  username: string;
  name: string;
  biography?: string;
  followers_count?: number;
  threads_profile_picture_url?: string;
}

export interface ThreadsPostContainer {
  id: string;
}

export interface ThreadsPublishResult {
  id: string;
}

/** Kết quả kiểm tra trạng thái container */
export interface ThreadsContainerStatusResult {
  id: string;
  status: ThreadsContainerStatus;
  error_message?: string;
}

/** Thông tin một bài đăng đầy đủ từ Threads API */
export interface ThreadsPost {
  id: string;
  text?: string;
  timestamp?: string;
  media_type?: ThreadsMediaType;
  media_url?: string;
  permalink?: string;
  shortcode?: string;
  thumbnail_url?: string;
  children?: { data: Array<{ id: string }> };
  is_quote_post?: boolean;
  has_replies?: boolean;
  hide_status?: "NOT_HUSHED" | "HUSHED";
  reply_audience?: "EVERYONE" | "ACCOUNTS_YOU_FOLLOW" | "MENTIONED_ONLY";
}

/** Thống kê insight cho một bài đăng */
export interface ThreadsPostInsights {
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  followers_count?: number;
  engagement?: number;
}

/** Giới hạn đăng bài (rate limit) */
export interface ThreadsPublishingLimit {
  config: {
    quota_total: number; // Tổng quota trong 24h (mặc định 250)
    quota_duration: number; // Giây (86400 = 24h)
  };
  quota_usage: number; // Số bài đã dùng trong kỳ
}

/** Thông tin token debug từ Meta */
export interface ThreadsTokenInfo {
  app_id: string;
  type: string;
  application: string;
  data_access_expires_at: number;
  expires_at: number; // Unix timestamp
  is_valid: boolean;
  issued_at: number;
  scopes: string[]; // Permissions đã cấp
  user_id: string;
  error?: { code: number; message: string; subcode: number };
}

/** Kết quả sau khi refresh / exchange token */
export interface ThreadsTokenResult {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

/** Kết quả full publish flow (internal) */
export interface ThreadsPublishFlow {
  containerId: string;
  postId: string;
  postedAt: string;
  quotaUsed: number;
  quotaRemaining: number;
}

// ---- App Internal Types ----

export interface ScheduledPost {
  id: string;
  content: string;
  topic: ContentTopic;
  slot: PostSlot;
  scheduledAt: string;
  postedAt?: string;
  threadsPostId?: string;
  status: PostStatus;
  errorMessage?: string;
  topicLabel?: string; // Chủ đề cụ thể AI đã chọn để viết
}

export interface PostHistory {
  posts: ScheduledPost[];
  lastUpdated: string;
}

export interface GenerateContentRequest {
  topic: ContentTopic;
  slot: PostSlot;
  keywords?: string[];
  customPrompt?: string;
}

export interface GenerateContentResponse {
  content: string;
  hashtags: string[];
  fullPost: string;
  topicLabel?: string; // Chủ đề cụ thể AI đã chọn để viết
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SchedulerStatus {
  enabled: boolean;
  running: boolean;
  jobs: {
    slot: PostSlot;
    cronExpression: string;
    label: string;
  }[];
  timezone: string;
  jobCount: number;
}
