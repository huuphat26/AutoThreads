// ============================================
// AUTO THREADS - AI Content Generator (Groq)
// ============================================
import Groq from "groq-sdk";
import type {
  ContentTopic,
  PostSlot,
  GenerateContentRequest,
  GenerateContentResponse,
} from "@/types";

let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY chưa được cấu hình trong .env");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// ----- Cấu hình chủ đề nội dung -----

const TOPIC_CONFIGS: Record<
  ContentTopic,
  { label: string; description: string }
> = {
  detox: {
    label: "Detox & Thanh lọc",
    description:
      "bí quyết detox, thanh lọc cơ thể, giảm mỡ bụng, đẩy độc tố, giảm cân an toàn dành cho phụ nữ",
  },
  beauty: {
    label: "Làm đẹp & Sắc vóc",
    description:
      "mẹo làm đẹp tự nhiên, căng bóng da, giữ dáng, đẹp từ bên trong bằng nước ép thờ trái cây rậu quả",
  },
  recipe: {
    label: "Công thức nước ép",
    description:
      "công thức nước ép detox cụ thể, nguyên liệu dễ kiếm, tác dụng rõ ràng, hướng dẫn từ̀ng bước",
  },
  sales: {
    label: "Giới thiệu Sản phẩm",
    description:
      "giới thiệu nước ép detox, combo sản phẩm, những tâm sự khách hàng, khuyến mãi hấp dẫn, CTA mạnh mẽ",
  },
  community: {
    label: "Cộng đồng Detox",
    description:
      "câu hỏi tương tác, chia sẻ hành trình giảm cân, challenge detox 7 ngày, xây dựng cộng đồng phụ nữ khỏe đẹp",
  },
};

const SLOT_CONFIGS: Record<PostSlot, { label: string; tone: string }> = {
  morning: {
    label: "7:30 Sáng",
    tone: "năng lượng dương, khởi đầu ngày mới, truyền động lực",
  },
  noon: {
    label: "12:00 Trưa",
    tone: "thông tin hữu ích, dễ đọc trong giờ nghỉ trưa, súc tích",
  },
  evening: {
    label: "18:00 Tối",
    tone: "thư giãn, chia sẻ, kết nối cộng đồng, nhìn lại ngày làm việc",
  },
};

// ----- Prompt Generator -----

function buildSystemPrompt(): string {
  return `Bạn là chuyên gia viết nội dung Threads cho thương hiệu Nước Ép Detox, hướng đến phụ nữ Việt Nam từ 22–45 tuổi quan tâm đến sức khỏe, giảm cân và làm đẹp tự nhiên.
Nhiệm vụ: Viết bài đăng Threads bằng tiếng Việt gần gũi, xây dựng niềm tin, tăng tương tác và chuyển đổi bán hàng.

NGUYÊN TẮc VIẺT BÀI:
1. Độ dài: 150–280 ký tự cho phần chính (không tính hashtag)
2. Mở đầu: hook mạnh, đặt vấn đề người đọc đang đối mặt (phình bụng, mệt mỏi, da xấu…)
3. Nội dung: bí quyết/mẹo thực tế, có giá trị, ngôn ngữ gần gũi như bạn bè chia sẻ
4. Kết thúc: CTA rõ ràng, tạo động lực comment/hỏi thăm/nhắn tin
5. Hashtag: 6-8 hashtag Liên quan detox, phụ nữ khỏe đẹp, giảm cân, nước ép
6. Emoji: 3-5 emoji tự nhiên, ưu tiên: 🌿🍋💧🌱💚🍐🥝
7. GIỌNG VĂN: thân thiện, chị em chia sẻ với nhau, không quá formal, không sáo rỗng

FORMAT OUTPUT (JSON):
{
  "content": "nội dung chính bài đăng (không gồm hashtag)",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "fullPost": "nội dung đầy đủ = content + newline + hashtags"
}`;
}

function buildUserPrompt(req: GenerateContentRequest): string {
  const topic = TOPIC_CONFIGS[req.topic];
  const slot = SLOT_CONFIGS[req.slot];
  const keywordsStr = req.keywords?.length
    ? `\nTừ khóa SEO cần lồng ghép: ${req.keywords.join(", ")}`
    : "";
  const customStr = req.customPrompt
    ? `\nYêu cầu đặc biệt: ${req.customPrompt}`
    : "";

  return `Viết bài đăng Threads về chủ đề: ${topic.label}
Nội dung cụ thể: ${topic.description}
Khung giờ đăng: ${slot.label} → Tone: ${slot.tone}${keywordsStr}${customStr}

Trả về JSON hợp lệ theo format đã định nghĩa.`;
}

// ----- Main Generator -----

/**
 * Tạo nội dung bài đăng Threads bằng AI (Groq - Free)
 */
export async function generateContent(
  req: GenerateContentRequest,
): Promise<GenerateContentResponse> {
  const groq = getGroq();

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(req) },
    ],
    temperature: 0.85,
    max_tokens: 700,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI không trả về nội dung");

  // Extract JSON từ response (có thể bọc trong ```json ... ```)
  const jsonMatch =
    raw.match(/```json\s*([\s\S]*?)```/) ||
    raw.match(/```\s*([\s\S]*?)```/) ||
    raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : raw;

  const parsed = JSON.parse(jsonStr.trim()) as GenerateContentResponse;

  if (!parsed.fullPost && parsed.content && parsed.hashtags) {
    parsed.fullPost = `${parsed.content}\n\n${parsed.hashtags.join(" ")}`;
  }

  return parsed;
}

/**
 * Lấy chủ đề ngẫu nhiên theo slot để tránh lặp
 */
export function getTopicForSlot(slot: PostSlot): ContentTopic {
  const topicsBySlot: Record<PostSlot, ContentTopic[]> = {
    morning: ["detox", "beauty", "recipe"], // Sáng: detox khởi đầu ngày
    noon: ["recipe", "sales", "beauty"], // Trưa: công thức + bán hàng
    evening: ["community", "detox", "sales"], // Tối: kết nối + tương tác
  };
  const options = topicsBySlot[slot];
  return options[Math.floor(Math.random() * options.length)];
}

export { TOPIC_CONFIGS, SLOT_CONFIGS };
