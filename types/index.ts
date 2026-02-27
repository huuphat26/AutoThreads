// ============================================
// AUTO THREADS - TypeScript Types
// ============================================

export type PostStatus = "pending" | "posted" | "failed" | "draft";

/** Dynamic topic ID — không còn hardcode, xem lib/topics.ts để thêm/sửa chủ đề */
export type ContentTopic = string;

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
  threads_biography?: string;
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

/**
 * Kết quả chi tiết từ GET /{media-id}/insights
 * Bao gồm đầy đủ tất cả metrics mà Meta API hỗ trợ
 */
export interface ThreadsMediaInsights {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  reach: number;
  shares: number;
  /** Raw data từ API — dùng khi cần truy cập metric chưa map */
  _raw?: Array<{
    name: string;
    title: string;
    description: string;
    values: Array<{ value: number }>;
  }>;
}

/** Kết quả tổng hợp: thông tin bài đăng + insights */
export interface ThreadsPostDetail {
  post: ThreadsPost;
  insights: ThreadsMediaInsights | null;
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

/** Params để tạo image container */
export interface CreateImageContainerParams {
  imageUrl: string;
  text?: string; // caption (tùy chọn, tối đa 500 ký tự)
}

/** Params để tạo video container */
export interface CreateVideoContainerParams {
  videoUrl: string;
  text?: string;
}

/** Kết quả full publish flow (internal) */
export interface ThreadsPublishFlow {
  containerId: string;
  postId: string;
  postedAt: string;
  quotaUsed: number;
  quotaRemaining: number;
  mediaType: ThreadsMediaType;
}

// ---- App Internal Types ----

export interface ScheduledPost {
  id: string;
  content: string;
  topic: ContentTopic;
  slot?: string;
  scheduledAt: string;
  postedAt?: string;
  threadsPostId?: string;
  status: PostStatus;
  errorMessage?: string;
  topicLabel?: string; // Chủ đề cụ thể AI đã chọn để viết
  mediaType?: ThreadsMediaType; // TEXT | IMAGE | VIDEO | CAROUSEL
  imageUrl?: string; // URL ảnh công khai (nếu đăng ảnh)
}

export interface PostHistory {
  posts: ScheduledPost[];
  lastUpdated: string;
}

export interface GenerateContentRequest {
  topic?: ContentTopic; // nếu không truyền sẽ random từ TOPICS
  slot?: string;
  lastTopic?: string; // id của chủ đề vừa đăng — để AI tránh lặp
  ctaStyle?: string; // "hoi-gap-khong" | "ru-thu-3-ngay" | "goi-hoi-thuc-don"
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
  paused: boolean;
  testMode: boolean;
  testIntervalMin: number | null;
  jobs: {
    id: string;
    cronExpression: string;
    label: string;
  }[];
  timezone: string;
  jobCount: number;
}

/** Thông tin một AI provider — an toàn để dùng cả client lẫn server */
export interface ProviderInfo {
  id: string;
  label: string;
  model: string; // model đang được chọn
  models: string[]; // danh sách model có sẵn
  available: boolean; // API key có hay không
}
