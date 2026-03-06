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
    id: "sang",
    label: "Bữa sáng Eat Clean",
    description:
      "bữa sáng nhẹ mà no lâu: yến mạch, toast bơ trứng, cháo dinh dưỡng, smoothie xanh, cơm nắm — ưu tiên protein + tinh bột phức để có năng lượng cả buổi sáng",
  },
  {
    id: "trua",
    label: "Bữa trưa Bento",
    description:
      "hộp cơm bento văn phòng: cơm + protein (gà, cá, thịt nạc, đậu hũ, bò) + rau — cân bằng đủ chất, no vừa phải, không buồn ngủ sau ăn",
  },
  {
    id: "toi",
    label: "Bữa tối nhẹ dạ",
    description:
      "bữa tối nhẹ nhàng, ăn xong không nặng bụng: canh, súp, salad, cháo — nấu đơn giản dưới 20 phút, không béo no, dễ ngủ",
  },
  {
    id: "bento",
    label: "Mealprep & Bento",
    description:
      "chuẩn bị thức ăn theo tuần, xếp hộp bento ngăn nắp, tiết kiệm thời gian buổi sáng — chia sẻ cách prep thực tế và ideas xếp ngăn đẹp",
  },
  {
    id: "viet_clean",
    label: "Món Việt Eat Clean",
    description:
      "biến tấu món Việt truyền thống theo kiểu nhẹ hơn: ít dầu, ít muối, giữ nguyên vị — canh, xào, hấp, kho nhẹ với nguyên liệu dễ tìm ở chợ",
  },
  {
    id: "nhat_han",
    label: "Món Nhật & Hàn",
    description:
      "bento kiểu Nhật, mì soba, udon, kimbap, kimchi, teriyaki, trứng hấp chawanmushi — nguồn cảm hứng Đông Á, nguyên liệu mua được ở siêu thị Việt Nam",
  },
  {
    id: "protein",
    label: "Protein mỗi ngày",
    description:
      "nguồn đạm đa dạng: trứng, ức gà, cá hồi, tôm, đậu hũ, thịt nạc, cá thu — cách chế biến đơn giản để ăn đủ đạm mà không ngán",
  },
  {
    id: "quick",
    label: "Nhanh 5–15 phút",
    description:
      "công thức cho ngày bận rộn: xào nhanh, salad trộn, cháo sẵn, cơm nắm — không cần kỹ năng nấu cao, nguyên liệu ít, dọn dẹp nhanh",
  },
  {
    id: "budget",
    label: "Budget lành mạnh",
    description:
      "ăn ngon, đủ chất với 50–70k/bữa: lựa nguyên liệu rẻ, dinh dưỡng cao — trứng, đậu hũ, rau cải, gạo lứt, cá biển, thịt nạc xay",
  },
  {
    id: "eat_clean",
    label: "Nguyên tắc Eat Clean",
    description:
      "ăn thật, ít chế biến: hạn chế đường tinh, dầu nhiều, thức ăn đóng gói — chia sẻ nhẹ nhàng, không phán xét, chỉ gợi ý thay thế đơn giản",
  },
  {
    id: "story",
    label: "Nhật ký ăn uống",
    description:
      "ghi chép thật: hôm nay ăn gì, cảm giác thế nào, ngày lười thì ra sao — tone chân thật, gần gũi, không hoàn hảo cũng không sao",
  },
  {
    id: "chay",
    label: "Bữa chay nhẹ",
    description:
      "ngày ăn chay hoặc ăn thực vật: đậu hũ non, nấm, rau củ, cháo chay, salad — không cần mỗi ngày, một bữa đổi vị cũng ổn",
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
