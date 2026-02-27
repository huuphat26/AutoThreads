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

export const TOPICS: TopicConfig[] = [
  {
    id: "detox",
    label: "Thanh lọc & Cơ thể",
    description:
      "cơ thể phụ nữ văn phòng hay đầy bụng, táo bón, mỡ bụng dưới, gan nhiễm mỡ nhẹ — chia sẻ nhẹ nhàng, đồng cảm, không giảng giải",
  },
  {
    id: "gut_health",
    label: "Sức khoẻ đường ruột",
    description:
      "vi khuẩn đường ruột, hội chứng ruột kích thích, đầy hơi sau bữa ăn — viết gần gũi như người đã trải qua, không dùng thuật ngữ y khoa",
  },
  {
    id: "beauty",
    label: "Da dẻ & Sắc vóc",
    description:
      "da xỉn màu, thiếu nước, ngủ muộn làm hỏng sắc vóc — gợi ý chăm sóc từ bên trong bằng rau củ quả, không bán kem/serum",
  },
  {
    id: "energy",
    label: "Năng lượng & Tinh thần",
    description:
      "mệt mỏi buổi chiều, não sương mù, uống cà phê vẫn buồn ngủ — liên hệ tới dinh dưỡng và hydration, không bán thuốc bổ",
  },
  {
    id: "weight",
    label: "Giảm mỡ & Vóc dáng",
    description:
      "mỡ bụng dưới chai lì, bụng to dù ăn ít — phân tích đơn giản về insulin, cortisol mà không dùng từ chuyên môn; gợi ý thực phẩm",
  },
  {
    id: "habit",
    label: "Thói quen lành mạnh",
    description:
      "thói quen nhỏ dễ làm: uống nước ấm sáng, ăn rau trước cơm, đi bộ 10 phút sau ăn — tone truyền động lực, không phán xét",
  },
  {
    id: "myth",
    label: "Sai lầm phổ biến",
    description:
      "nhịn ăn sáng để giảm cân, uống nước đá hại dạ dày, kiêng trái cây vì đường — debunk nhẹ nhàng, không khoa trương",
  },
  {
    id: "drink_choice",
    label: "Lựa chọn đồ uống",
    description:
      "so sánh nước ngọt / cà phê / trà sữa vs nước ép rau củ — không phán xét lựa chọn của người đọc, chỉ gợi mở thay đổi nhỏ",
  },
  {
    id: "story",
    label: "Câu chuyện đời thường",
    description:
      "quan sát đời thường: bữa trưa văn phòng, giờ nghỉ ngắn, áp lực deadline — xây dựng đồng cảm, dẫn dắt tự nhiên sang healthy",
  },
  {
    id: "community",
    label: "Kết nối & Chia sẻ",
    description:
      "hành trình chăm sóc bản thân không hoàn hảo, lắng nghe cơ thể, chia sẻ thật — tạo cảm giác cộng đồng phụ nữ đồng hành",
  },
  {
    id: "season",
    label: "Theo mùa & Thời tiết",
    description:
      "nóng bức mất nước, trời lạnh ít uống nước, giao mùa dễ ốm — gắn với thực tế thời tiết để nội dung luôn tươi mới",
  },
  {
    id: "sleep",
    label: "Giấc ngủ & Phục hồi",
    description:
      "ngủ muộn sau 12h, khó ngủ vì lo nghĩ, dậy vẫn mệt — kết nối với ăn uống và detox nhẹ, không bán thực phẩm chức năng",
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
