/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// AUTO THREADS - AI Content Generator (Gemini)
// SDK: @google/genai
// ============================================

import { GoogleGenAI, Type } from "@google/genai";
import type {
  ContentTopic,
  PostSlot,
  GenerateContentRequest,
  GenerateContentResponse,
} from "@/types";

// ----- Cấu hình chủ đề nội dung -----

const TOPIC_CONFIGS: Record<
  ContentTopic,
  { label: string; description: string }
> = {
  detox: {
    label: "Thanh lọc & Cơ thể",
    description:
      "cơ thể phụ nữ văn phòng hay đầy bụng, táo bón, mỡ bụng dưới — chia sẻ nhẹ nhàng, đồng cảm",
  },
  beauty: {
    label: "Da dẻ & Sắc vóc",
    description:
      "da xỉn, thiếu nước, ngủ muộn ảnh hưởng sắc vóc — gợi ý chăm sóc từ bên trong bằng rau củ quả",
  },
  recipe: {
    label: "Thói quen lành mạnh",
    description:
      "thói quen uống cà phê thay bữa sáng, thiếu rau xanh, chất xơ — gợi mở thay đổi nhỏ mỗi ngày",
  },
  sales: {
    label: "Câu chuyện đời thường",
    description:
      "quan sát đời thường về phụ nữ văn phòng, tâm sự nhẹ nhàng, xây dựng sự đồng cảm và niềm tin",
  },
  community: {
    label: "Kết nối & Chia sẻ",
    description:
      "chia sẻ hành trình chăm sóc sức khỏe, lắng nghe cơ thể, tạo kết nối với cộng đồng phụ nữ",
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

function buildSystemPrompt(currentTime: string, dayOfWeek: string): string {
  return `SYSTEM PROMPT — THREADS WRITER (ÉP XANH / VIETNAM)

Bạn là người viết nội dung Threads cho thương hiệu nước ép healthy “Ép Xanh” tại Việt Nam.

TRẠNG THÁI THỜI GIAN HIỆN TẠI (QUAN TRỌNG ĐỂ VIẾT ĐÚNG NGỮ CẢNH):
- Bây giờ là: ${currentTime}
- Thứ trong tuần: ${dayOfWeek}
=> Tuyệt đối KHÔNG viết bài chào buổi sáng vào buổi chiều/tối và ngược lại. Kiểm tra kỹ thời gian trước khi chọn Hook và Tone.

1) PERSONA (BẮT BUỘC GIỮ ĐÚNG)
- Nữ, 15–35 tuổi.
- Chủ một tiệm nước ép nhỏ.
- Hiểu các vấn đề cơ thể của phụ nữ bận rộn / dân văn phòng.
- Không phải bác sĩ. Không giảng bài khoa học. Không viết kiểu chuyên gia.
- Giọng kể như tâm sự với bạn bè trên mạng xã hội.

2) MỤC TIÊU NỘI DUNG
- Khiến người đọc dừng lại và đọc hết.
- Tạo cảm giác “bài này đang nói về mình”.
- Xây dựng niềm tin về lối sống healthy.
- Tạo chuyển đổi tự nhiên (đọc xong muốn hỏi / muốn thử), KHÔNG quảng cáo lộ liễu.

3) QUY TẮC BÀI VIẾT (CỰC KỲ QUAN TRỌNG)
- Viết tiếng Việt.
- Độ dài: 50–100 chữ (ưu tiên). Không vượt 300 từ.
- Dễ đọc, chia đoạn ngắn 1–3 câu/đoạn.
- Không viết kiểu blog; không “giảng giải”.
- Không thuật ngữ y khoa phức tạp.
- Emoji: tối đa 2.
- Tuyệt đối KHÔNG hashtag trong nội dung.
- Tuyệt đối KHÔNG nhắc AI/ChatGPT/trợ lý.
- Tránh văn quảng cáo, tránh sáo rỗng.

4) CHẤT LIỆU NÊN LỒNG GHÉP TỰ NHIÊN (CHỌN 1–3 Ý MỖI BÀI)
- mỡ bụng dưới
- táo bón
- da xỉn
- ngủ muộn
- stress công việc
- bỏ bữa sáng hoặc uống cà phê thay bữa
- thiếu rau và chất xơ

5) XU HƯỚNG / BỐI CẢNH (CHỈ KHI HỢP CHỦ ĐỀ, KHÔNG GƯỢNG)
- thói quen người trẻ hiện nay
- dân văn phòng
- làm việc khuya
- cà phê, trà sữa, đồ ăn nhanh
- lifestyle: self-care, eat clean, gut health
- KHÔNG nhắc tên người nổi tiếng cụ thể.

6) CTA (BẮT BUỘC Ở CUỐI BÀI)
Bài phải kết thúc bằng 1 câu gợi mở hành động, KHÔNG bán hàng trực tiếp.
CTA hợp lệ (chọn 1):
- hỏi ý kiến người đọc
- rủ thử thói quen 3 ngày
- mời để lại comment
- gợi nhắn tin hỏi thực đơn
- hỏi cơ thể họ đang gặp vấn đề gì

TỪ CẤM (TUYỆT ĐỐI KHÔNG DÙNG):
“mua ngay”, “giá chỉ”, “chốt đơn”, “khuyến mãi”, “inbox đặt hàng”.

7) PHÂN LOẠI THEO NGÀY (SỬ DỤNG BIẾN day_of_week ĐƯỢC CUNG CẤP: ${dayOfWeek})
- THU_2 — Hiểu cơ thể: Giải thích vấn đề đời thường + lý do sâu xa từ thói quen sống.
- THU_3 — Sai lầm phổ biến: Dạng list 4–6 ý ngắn, mỗi ý 1 dòng.
- THU_4 — Câu chuyện khách: Kể chuyện khách nữ văn phòng chân thật.
- THU_5 — Tips áp dụng: Tips đơn giản làm tại nhà, 3–5 bước.
- THU_6 — Tâm sự cá nhân: Góc nhìn người bán đồ healthy, cảm xúc nhẹ.
- THU_7 — Kiến thức detox: Giải thích detox đời thường, không thần thánh hóa.
- CHU_NHAT — Soft chuyển đổi: Chuẩn bị nước ép, thực đơn tuần. CTA nhắn tin hỏi thực đơn.

8) CÁCH “AUTO BÓC TÁCH” ĐẦU VÀO (TỰ THỰC HIỆN NGẦM)
- Hook: 1 câu mở gây đồng cảm.
- Pain: chọn 1–2 vấn đề phù hợp từ mục 4.
- Angle: theo mục 7.
- CTA: theo mục 6.

9) KIỂM LỖI TRƯỚC KHI TRẢ KẾT QUẢ (NỘI BỘ)
- 50–100 chữ. Không hashtag. Emoji ≤ 2. Không từ cấm. Có CTA.

10) OUTPUT FORMAT (CHỈ TRẢ VỀ JSON)
Mọi phản hồi phải là JSON hợp lệ:
{
  "content": "nội dung chính bài đăng"
}`;
}

function buildUserPrompt(
  req: GenerateContentRequest,
  currentTime: string,
  dayOfWeek: string,
): string {
  const topic = TOPIC_CONFIGS[req.topic];
  const slot = SLOT_CONFIGS[req.slot];
  const keywordsStr = req.keywords?.length
    ? `\nTừ khóa SEO cần lồng ghép: ${req.keywords.join(", ")}`
    : "";
  const customStr = req.customPrompt
    ? `\nYêu cầu đặc biệt: ${req.customPrompt}`
    : "";

  return `Viết bài đăng Threads cho khung giờ: ${slot.label} (${slot.tone}).
Chủ đề: ${topic.label}
Góc nhìn: ${topic.description}

BỐI CẢNH HIỆN TẠI:
- Thời gian: ${currentTime}
- Thứ: ${dayOfWeek}
- Phân loại bài viết yêu cầu cho ngày ${dayOfWeek}: theo mục 7 trong System Prompt.${keywordsStr}${customStr}

Đảm bảo nội dung bài viết phù hợp CHÍNH XÁC với thời điểm ${currentTime}. Nếu là buổi chiều/tối, tuyệt đối không bắt đầu bằng "Chào buổi sáng".

Trả về JSON với key "content".`;
}

// ----- Helpers -----

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong .env");
  return new GoogleGenAI({ apiKey });
}

/**
 * Sửa JSON bị lỗi do AI trả về newline/tab/quote chưa escape trong string values.
 */
function sanitizeJsonString(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      result += ch;
      if (inString) escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      if (ch === "\n") {
        result += "\\n";
        continue;
      }
      if (ch === "\r") {
        result += "\\r";
        continue;
      }
      if (ch === "\t") {
        result += "\\t";
        continue;
      }
    }

    result += ch;
  }

  return result;
}

function extractJson(raw: string): string {
  const m =
    raw.match(/```json\s*([\s\S]*?)```/i) ||
    raw.match(/```\s*([\s\S]*?)```/i) ||
    raw.match(/(\{[\s\S]*\})/);

  const jsonStr = (m ? m[1] : raw).trim();
  return sanitizeJsonString(jsonStr);
}

function extractContentValue(raw: string): string {
  const keyRegex = /"content"\s*:\s*"/i;
  const keyMatch = keyRegex.exec(raw);
  if (!keyMatch) return "";

  const start = (keyMatch.index ?? 0) + keyMatch[0].length;
  let result = "";
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      break;
    }

    result += ch;
  }

  return result
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .trim();
}

/**
 * Parse JSON an toàn — nếu JSON.parse thất bại, cố gắng trích xuất từng field bằng regex.
 */
function safeParseResponse(raw: string): GenerateContentResponse {
  const cleanRaw = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  // Lần 1: thử parse trực tiếp
  try {
    return JSON.parse(cleanRaw) as GenerateContentResponse;
  } catch {
    // ignore
  }

  // Lần 2: sanitize rồi parse lại
  const sanitized = extractJson(cleanRaw);
  try {
    return JSON.parse(sanitized) as GenerateContentResponse;
  } catch {
    // ignore
  }

  // Lần 3: fallback — trích xuất content bằng regex cực mạnh
  console.warn(
    "[ContentGenerator] JSON parse failed, using powerful regex fallback. Raw length:",
    raw.length,
  );

  const content = extractContentValue(cleanRaw);

  if (!content) {
    // Lần 4: Nếu tất cả các cách trên đều thất bại, coi toàn bộ raw là content (nếu không có cấu trúc JSON)
    if (!cleanRaw.includes('"{') && !cleanRaw.includes('"content"')) {
      return { content: cleanRaw, hashtags: [], fullPost: cleanRaw };
    }

    throw new Error(
      `AI trả về JSON không hợp lệ. Raw response snippet: ${raw.slice(0, 100)}`,
    );
  }

  return { content, hashtags: [], fullPost: content };
}

// ----- Main Generator -----

/**
 * Tạo nội dung bài đăng Threads bằng AI (Gemini - @google/genai)
 */
export async function generateContent(
  req: GenerateContentRequest,
): Promise<GenerateContentResponse> {
  const ai = getAI();

  const now = new Date();
  const currentTime = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayOfWeekMap: Record<number, string> = {
    0: "CHU_NHAT",
    1: "THU_2",
    2: "THU_3",
    3: "THU_4",
    4: "THU_5",
    5: "THU_6",
    6: "THU_7",
  };
  const dayOfWeek = dayOfWeekMap[now.getDay()];

  const res = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: buildUserPrompt(req, currentTime, dayOfWeek),
    config: {
      systemInstruction: buildSystemPrompt(currentTime, dayOfWeek),
      temperature: 0.85,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          content: {
            type: Type.STRING,
            description:
              "Nội dung bài đăng Threads, tối đa 300 từ, phù hợp ngữ cảnh thời gian",
          },
        },
        required: ["content"],
      },
    },
  });

  // Lấy text: ưu tiên từ candidates, fallback res.text
  let raw = "";
  const candidate = (res as any)?.candidates?.[0];
  if (candidate?.content?.parts?.length) {
    raw = candidate.content.parts.map((p: any) => p.text ?? "").join("");
  }
  if (!raw) {
    raw = (res as any)?.text ?? "";
  }
  if (!raw) throw new Error("AI không trả về nội dung");

  const parsed = safeParseResponse(raw);

  // Đảm bảo fullPost luôn có giá trị
  if (!parsed.fullPost) {
    parsed.fullPost = parsed.content;
  }
  // Không dùng hashtag theo brand rules
  if (!parsed.hashtags) {
    parsed.hashtags = [];
  }

  // Threads giới hạn 500 ký tự — cắt an toàn nếu AI vượt
  if (parsed.fullPost.length > 500) {
    parsed.fullPost = parsed.fullPost.slice(0, 497) + "...";
  }
  if (parsed.content.length > 500) {
    parsed.content = parsed.content.slice(0, 497) + "...";
  }

  return parsed;
}

/**
 * Streaming version of generateContent
 */
export async function* generateContentStream(req: GenerateContentRequest) {
  const ai = getAI();

  const now = new Date();
  const currentTime = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayOfWeekMap: Record<number, string> = {
    0: "CHU_NHAT",
    1: "THU_2",
    2: "THU_3",
    3: "THU_4",
    4: "THU_5",
    5: "THU_6",
    6: "THU_7",
  };
  const dayOfWeek = dayOfWeekMap[now.getDay()];

  const responseStream = ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: buildUserPrompt(req, currentTime, dayOfWeek),
    config: {
      systemInstruction: buildSystemPrompt(currentTime, dayOfWeek),
      temperature: 0.85,
      maxOutputTokens: 2048,
      // No schema for streaming to allow more flexibility
    },
  });

  let fullResponse = "";
  for await (const chunk of await responseStream) {
    const chunkText = chunk.text;
    if (chunkText) {
      fullResponse += chunkText;
      yield chunkText;
    }
  }

  return fullResponse;
}

/**
 * Lấy chủ đề ngẫu nhiên theo slot để tránh lặp
 */
export function getTopicForSlot(slot: PostSlot): ContentTopic {
  const topicsBySlot: Record<PostSlot, ContentTopic[]> = {
    morning: ["detox", "recipe", "beauty"], // Sáng: cơ thể, thói quen, da dẻ
    noon: ["recipe", "sales", "beauty"], // Trưa: thói quen, câu chuyện, sắc vóc
    evening: ["community", "sales", "detox"], // Tối: kết nối, đời thường, thanh lọc
  };
  const options = topicsBySlot[slot];
  return options[Math.floor(Math.random() * options.length)];
}

export { TOPIC_CONFIGS, SLOT_CONFIGS };
