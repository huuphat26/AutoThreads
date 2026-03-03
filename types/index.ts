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
  source?: "auto" | "manual"; // Nguồn gốc: tự động (scheduler) hay thủ công
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
  dailyPostLimit: number;
  todayPosted: number;
  /** Danh sách slotId đã bị bỏ qua hôm nay */
  skippedSlots: string[];
  jobs: {
    id: string;
    cronExpression: string;
    label: string;
  }[];
  timezone: string;
  jobCount: number;
  /** ISO string — thời điểm server/scheduler khởi động lần gần nhất */
  serverStartedAt?: string;
}

// ============================================
// Instagram Graph API Types (Facebook Login)
// Docs: developers.facebook.com/docs/instagram-platform
// ============================================

export type IGMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
export type IGMediaProductType = "FEED" | "STORY" | "REELS" | "AD";
export type IGContainerStatus =
  | "IN_PROGRESS"
  | "FINISHED"
  | "ERROR"
  | "EXPIRED"
  | "PUBLISHED";

export interface IGProfile {
  id: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string | null;
  website: string | null;
}

export interface IGMedia {
  id: string;
  caption: string | null;
  commentsCount: number;
  likeCount: number;
  mediaProductType: IGMediaProductType | null;
  mediaType: IGMediaType;
  mediaUrl: string | null;
  permalink: string | null;
  shortcode: string | null;
  thumbnailUrl: string | null;
  timestamp: string;
  username: string | null;
  isCommentEnabled: boolean;
}

export interface IGComment {
  id: string;
  text: string;
  timestamp: string;
  username: string | null;
  likeCount: number;
  repliesCount: number;
  hidden: boolean;
  parentId?: string;
}

export interface IGMediaInsights {
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  reach: number;
  views: number;
  plays: number;
  totalInteractions: number;
  _raw?: Array<{ name: string; values: Array<{ value: number }> }>;
}

export interface IGAccountInsights {
  followerCount: number;
  reach: number;
  views: number;
  period: string;
  _raw?: Array<{
    name: string;
    period: string;
    values: Array<{ value: number; end_time: string }>;
  }>;
}

export interface IGPublishingLimit {
  quotaUsage: number;
  quotaTotal: number;
  quotaDuration: number;
}

/** Params để tạo IG media container */
export interface IGPublishParams {
  /** URL ảnh công khai HTTPS — required cho IMAGE */
  imageUrl?: string;
  /** URL video công khai — required cho REELS */
  videoUrl?: string;
  caption?: string;
  mediaType?: "IMAGE" | "REELS" | "CAROUSEL";
  /** Chia sẻ Reels lên Feed */
  shareToFeed?: boolean;
  /** Đánh dấu item là thành phần của Carousel */
  isCarouselItem?: boolean;
  /** Danh sách container ID cho Carousel container */
  children?: string[];
}

export interface IGPublishResult {
  containerId: string;
  mediaId: string;
  permalink: string | null;
  timestamp: string;
}

export interface IGTokenStatus {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
  appId: string | null;
}

// ============================================
// Facebook Graph API Types (Professional Mode / Creator Page)
// Docs: developers.facebook.com/docs/graph-api
// ============================================

/** Thông tin creator page do user quản lý */
export interface FBPage {
  id: string;
  name: string;
  fanCount: number;
  link: string | null;
  pictureUrl: string | null;
  category: string | null;
  about: string | null;
  website: string | null;
  followersCount: number;
  accessToken?: string; // có khi lấy từ /me/accounts
}

/** Một bài đăng trên Facebook Page */
export interface FBPost {
  id: string;
  message: string | null;
  story: string | null;
  createdTime: string;
  permalinkUrl: string | null;
  fullPicture: string | null;
  attachments: FBAttachment[] | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

/** Attachment (ảnh / video / link) đính kèm bài đăng */
export interface FBAttachment {
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  mediaUrl: string | null;
}

/** Một comment trên bài viết Facebook */
export interface FBComment {
  id: string;
  message: string;
  createdTime: string;
  from: { id: string; name: string } | null;
  likeCount: number;
  canHide: boolean;
  canRemove: boolean;
  parentId: string | null;
}

/** Engagement summary cho một bài đăng */
export interface FBPostEngagement {
  postId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  reactionsCount: number;
  reactions: FBReactionSummary[];
}

/** Tóm tắt reactions theo type */
export interface FBReactionSummary {
  type: "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY" | "CARE";
  totalCount: number;
}

/** Insights của một bài đăng */
export interface FBPostInsights {
  impressions: number;
  impressionsUnique: number;
  impressionsPaid: number;
  engagedUsers: number;
  reactions: number;
  clicks: number;
  clicksUnique: number;
  videoViews: number | null;
  _raw?: Array<{ name: string; values: Array<{ value: number }> }>;
}

/** Insights cấp page */
export interface FBPageInsights {
  period: string;
  metrics: Record<string, number>;
  _raw?: Array<{
    name: string;
    period: string;
    values: Array<{ value: number | Record<string, number>; end_time: string }>;
  }>;
}

/** Kết quả đăng bài thành công */
export interface FBPublishResult {
  postId: string;
  permalink: string | null;
  timestamp: string;
}

/** Trạng thái token Facebook */
export interface FBTokenStatus {
  isValid: boolean;
  expiresAt: string | null;
  daysLeft: number | null;
  scopes: string[];
  appId: string | null;
  type: string | null;
}

// ============================================

// ============================================
// Facebook App Internal Types (Scheduler & Compose)
// ============================================

export type FBPostStatus =
  | "scheduled"
  | "pending"
  | "posted"
  | "failed"
  | "cancelled";

export type FBMediaType = "TEXT" | "IMAGE" | "VIDEO";

/** Bài đăng Facebook được lên lịch hoặc đã đăng */
export interface FBScheduledPost {
  id: string;
  message: string;
  mediaType: FBMediaType;
  imageUrl?: string;
  videoUrl?: string;
  /** ISO string — thời điểm hẹn đăng (hoặc thời điểm tạo khi đăng ngay) */
  scheduledAt: string;
  /** ISO string — thời điểm đăng thành công */
  postedAt?: string;
  /** Post ID từ Facebook Graph API sau khi đăng xong */
  fbPostId?: string;
  /** Permalink đến bài đăng trên Facebook */
  fbPermalinkUrl?: string;
  status: FBPostStatus;
  errorMessage?: string;
  /** ID chủ đề AI đã dùng để tạo nội dung */
  topic?: string;
  /** Nhãn chủ đề đẹp để hiển thị */
  topicLabel?: string;
  source: "auto" | "manual";
}

export interface FBPostHistory {
  posts: FBScheduledPost[];
  lastUpdated: string;
}

// ============================================
// Instagram App Internal Types (Scheduler & Compose)
// Lưu ý: Instagram KHÔNG hỗ trợ text-only post — bắt buộc phải có media.
// Loại hỗ trợ: IMAGE (ảnh + caption) | REELS (video + description)
// ============================================

export type IGPostStatus =
  | "scheduled"
  | "pending"
  | "posted"
  | "failed"
  | "cancelled";

/** Loại media IG hỗ trợ đăng qua scheduler */
export type IGScheduleMediaType = "IMAGE" | "REELS";

/** Bài đăng Instagram được lên lịch hoặc đã đăng */
export interface IGScheduledPost {
  id: string;
  /** Caption / mô tả bài đăng (AI hoặc thủ công) */
  caption: string;
  mediaType: IGScheduleMediaType;
  /** URL ảnh công khai HTTPS — bắt buộc khi mediaType === "IMAGE" */
  imageUrl?: string;
  /** URL video công khai — bắt buộc khi mediaType === "REELS" */
  videoUrl?: string;
  /** true → chia sẻ Reels lên Feed */
  shareToFeed?: boolean;
  /** ISO string — thời điểm hẹn đăng */
  scheduledAt: string;
  /** ISO string — thời điểm đăng thực tế */
  postedAt?: string;
  /** Container ID từ IG API bước 1 */
  igContainerId?: string;
  /** Media ID sau khi publish thành công */
  igMediaId?: string;
  /** Permalink đến bài đăng trên Instagram */
  igPermalinkUrl?: string;
  status: IGPostStatus;
  errorMessage?: string;
  topic?: string;
  topicLabel?: string;
  source: "auto" | "manual";
}

export interface IGPostHistory {
  posts: IGScheduledPost[];
  lastUpdated: string;
}

/** Thông tin một AI provider — an toàn để dùng cả client lẫn server */
export interface ProviderInfo {
  id: string;
  label: string;
  model: string; // model đang được chọn
  models: string[]; // danh sách model có sẵn
  available: boolean; // API key có hay không
}

// ============================================
// Threads App Internal Types (Manual Scheduler)
// Tách biệt với ScheduledPost (auto-scheduler slot-based).
// Dùng cho tính năng Hẹn giờ đăng thủ công.
// ============================================

export type ThreadsManualPostStatus =
  | "scheduled"
  | "pending"
  | "posted"
  | "failed"
  | "cancelled";

export type ThreadsManualMediaType = "TEXT" | "IMAGE";

/** Bài đăng Threads được hẹn giờ hoặc đăng ngay (manual) */
export interface ThreadsManualPost {
  id: string;
  /** Nội dung văn bản / caption */
  content: string;
  mediaType: ThreadsManualMediaType;
  /** URL ảnh công khai HTTPS — bắt buộc khi mediaType === "IMAGE" */
  imageUrl?: string;
  /** ISO string — thời điểm hẹn đăng */
  scheduledAt: string;
  /** ISO string — thời điểm đăng thực tế */
  postedAt?: string;
  /** Post ID từ Threads API sau khi đăng xong */
  threadsPostId?: string;
  status: ThreadsManualPostStatus;
  errorMessage?: string;
  source: "manual";
}

export interface ThreadsManualPostHistory {
  posts: ThreadsManualPost[];
  lastUpdated: string;
}

// ============================================
// Auto-Scheduler — 3-platform sequential post (AI)
// Chạy lúc 12:00 và 18:00 mỗi ngày:
//   FB → 2 phút → Threads → 2 phút → IG
// ============================================

export type AutoPostSlot = "noon" | "evening";

export type AutoPostPlatformStatus =
  | "pending"
  | "posted"
  | "failed"
  | "skipped";

/** Kết quả đăng bài trên một nền tảng cụ thể */
export interface AutoPostPlatformResult {
  status: AutoPostPlatformStatus;
  postId?: string;
  permalinkUrl?: string;
  errorMessage?: string;
  postedAt?: string;
}

/** Một lần chạy auto-post (1 slot = 3 nền tảng) */
export interface AutoPostRecord {
  id: string;
  slot: AutoPostSlot;
  /** ISO string — thời điểm bắt đầu chạy */
  triggeredAt: string;
  /** Chủ đề AI đã chọn */
  topic: string;
  topicLabel?: string;
  /** Nội dung AI soạn (dùng cho FB + Threads) */
  content: string;
  /** Caption riêng cho Instagram */
  igCaption: string;
  /** URL ảnh đã dùng cho Instagram */
  igImageUrl?: string;
  /** Kết quả từng nền tảng */
  facebook: AutoPostPlatformResult;
  threads: AutoPostPlatformResult;
  instagram: AutoPostPlatformResult;
  /** Trạng thái tổng */
  overallStatus:
    | "waiting_for_ai"
    | "running"
    | "completed"
    | "partial"
    | "failed";
}

export interface AutoPostHistory {
  records: AutoPostRecord[];
  lastUpdated: string;
}
