// ============================================
// AUTO THREADS — Dynamic Topic Definitions
// Thêm / sửa / xoá chủ đề tại đây, không cần
// động đến type hay prompt ở nơi khác.
// ============================================

export interface TopicConfig {
  id: string;
  label: string;
  /** Mô tả góc nhìn — được inject thẳng vào user prompt */
  description: string;
}

// ─── Danh sách chủ đề — chỉnh sửa tuỳ ý ────────────────────────────────────
// Series: "Hôm nay ăn gì" (#homnayangi) — Eat Clean mỗi ngày 3 bữa

export const TOPICS: TopicConfig[] = [
  {
    id: "general",
    label: "General Content",
    description: "Generic content from pool",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Lấy ngẫu nhiên một chủ đề */
export function getRandomTopic(): TopicConfig {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

/** Tìm chủ đề theo id — undefined nếu không có */
export function getTopicById(id: string): TopicConfig | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Lấy chủ đề theo id, fallback random nếu không tồn tại */
export function resolveTopicOrRandom(id?: string): TopicConfig {
  if (!id) return getRandomTopic();
  return getTopicById(id) ?? getRandomTopic();
}
