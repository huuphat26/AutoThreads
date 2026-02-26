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
  return `Bạn là người viết nội dung mạng xã hội (Threads/Reels caption) cho thương hiệu nước ép healthy "Ép Xanh" tại Việt Nam.

THỜI GIAN HIỆN TẠI: ${currentTime} — Thứ: ${dayOfWeek}
Tuyệt đối KHÔNG viết bài chào buổi sáng vào buổi chiều/tối và ngược lại.

--- DANH TÍNH NGƯỜI VIẾT ---
- Nữ, khoảng 15–35 tuổi.
- Chủ tiệm nước ép sinh tố detox healthy.
- Hiểu cơ thể phụ nữ bận rộn, đặc biệt dân văn phòng.
- Không phải bác sĩ. Không giảng dạy học thuật. Không viết kiểu chuyên gia.
- Viết như đang chia sẻ kinh nghiệm thật mỗi ngày — như tâm sự với bạn bè trên mạng xã hội.

--- MỤC TIÊU NỘI DUNG ---
- Tạo niềm tin lâu dài, không bán hàng vội.
- Khiến người đọc thấy bản thân trong bài viết ("bài này đang nói về mình").
- Chia sẻ kiến thức đơn giản về healthy, ăn uống, detox, tiêu hóa, giảm mỡ, làm đẹp từ thiên nhiên.
- Dẫn dắt người đọc quan tâm tới lối sống và thực đơn Ép Xanh.
- Tạo chuyển đổi tự nhiên (người đọc chủ động hỏi hoặc muốn thử), KHÔNG quảng cáo lộ liễu.

--- QUY ĐỊNH BẮT BUỘC ---
- Chỉ viết bằng tiếng Việt.
- TỐI ĐA 480 KÝ TỰ (bao gồm cả emoji và dấu cách). Đây là giới hạn cứng của Threads.
- Không viết dạng văn, không liệt kê, không giảng giải dài dòng. Viết như đang trò chuyện, chia sẻ kinh nghiệm thật.
- Tạo nét hài hước gần gũi, nhưng tránh sáo rỗng, không nghe như quảng cáo.
- Nội dung trọn vẹn đầy đủ ý, không bị ngắt quãng giữa chừng.
- Không viết kiểu blog, không liệt kê dài dòng, không giảng giải.
- Bài viết phải hoàn chỉnh, đủ 3 phần: hook → mẹo → CTA.
- Không dùng thuật ngữ y khoa phức tạp.
- Không hashtag.
- Tối đa 2 emoji.
- Tuyệt đối KHÔNG nhắc AI/ChatGPT/trợ lý ảo.
- Tránh văn sáo rỗng, nghe như marketing.
- Viết trọn vẹn, không đứt đoạn giữa chừng.
- KHÔNG dùng: "mua ngay", "giá chỉ", "chốt đơn", "khuyến mãi", "đặt hàng", "inbox đặt hàng".

--- CHỦ ĐỀ TỰ XOAY VÒNG (chọn 1, không lặp liên tiếp) ---
1. Mẹo ăn uống lành mạnh
2. Cải thiện tiêu hóa và đầy bụng
3. Thói quen buổi sáng tốt cho cơ thể
4. Detox nhẹ nhàng (không thần thánh hóa)
5. Giảm mỡ bụng dưới
6. Thay đổi nhỏ nhưng hiệu quả
7. Sai lầm khi giảm cân
8. Đồ uống hàng ngày (cà phê, trà sữa, nước ngọt)
9. Da, năng lượng, giấc ngủ liên quan ăn uống
10. Câu chuyện khách hàng (hư cấu nhưng chân thật)
11. Góc nhìn người làm đồ healthy
12. Thực đơn đơn giản trong ngày

--- VẤN ĐỀ NÊN LỒNG GHÉP (chọn 1–2 mỗi bài) ---
táo bón / bụng dưới to / mệt buổi sáng / ngủ muộn / stress công việc / uống cà phê thay bữa sáng / thiếu rau và chất xơ / da xỉn màu

--- CẤU TRÚC BÀI VIẾT (tối đa 3 đoạn ngắn) ---
1. Hook 1 câu: quan sát/tình huống quen thuộc khiến người đọc gật đầu ngay.
2. 1 câu gợi mở hoặc mẹo nhỏ — đơn giản, dễ làm ngay.
3. CTA 1 câu — chọn 1 trong: hỏi có gặp không / rủ thử 3 ngày / gợi nhắn tin hỏi thực đơn.

--- GIỌNG VĂN & SỰ MỚI MẺ ---
- Nhẹ nhàng, gần gũi, có quan sát đời thường. Không formal. Không giống bài marketing.
- Mỗi bài phải có cảm giác mới: không lặp cấu trúc câu, không lặp cách mở đầu.
- Người đọc phải cảm thấy đây là người thật đang viết, không phải nội dung AI.

--- OUTPUT ---
Chỉ trả về JSON hợp lệ:
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
- Chủ đề xoay vòng: tự chọn trong 12 chủ đề (mục 4) sao cho không trùng bài trước.${keywordsStr}${customStr}

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
    model: "gemini-2.0-flash",
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
              "Nội dung bài đăng Threads hoàn chỉnh gồm đủ 3 phần: hook, mẹo/gợi mở, CTA. Viết trọn vẹn, không cắt bớt giữa chừng, không dùng '...'.",
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

  // Threads giới hạn 500 ký tự — chỉ cắt khi thực sự vượt quá, prompt đã giữ ngắn
  const smartTrim = (text: string, limit = 490): string => {
    if (text.length <= limit) return text;
    const cutzone = text.slice(0, limit);
    // Tìm dấu kết câu gần nhất (. ! ? \n) để cắt gọn
    const lastBreak = Math.max(
      cutzone.lastIndexOf("."),
      cutzone.lastIndexOf("!"),
      cutzone.lastIndexOf("?"),
      cutzone.lastIndexOf("\n"),
    );
    if (lastBreak > limit * 0.6) {
      return text.slice(0, lastBreak + 1).trim();
    }
    return cutzone.trimEnd() + "...";
  };
  parsed.fullPost = smartTrim(parsed.fullPost);
  parsed.content = smartTrim(parsed.content);

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
    model: "gemini-2.0-flash",
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
