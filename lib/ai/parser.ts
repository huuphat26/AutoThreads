// ============================================
// AUTO THREADS — AI Response Parser
// Xử lý mọi định dạng trả về từ các model AI
// phổ biến (Gemini, OpenAI, Anthropic…)
// ============================================

import type { GenerateContentResponse } from "@/types";

// ─── JSON Extraction ─────────────────────────────────────────────────────────

/**
 * Bóc tách chuỗi JSON thô từ response — xử lý:
 * - ```json … ``` / ``` … ```
 * - { … } trực tiếp
 * - Văn bản thừa trước/sau
 */
function extractRawJson(text: string): string {
  // Markdown code fence (```json hoặc ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  // Tìm khối JSON đầu tiên { … }
  const brace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (brace !== -1 && lastBrace > brace) {
    return text.slice(brace, lastBrace + 1).trim();
  }

  return text.trim();
}

/**
 * Escape các ký tự đặc biệt bên trong string value của JSON
 * để JSON.parse không bị lỗi khi AI trả về newline/tab chưa escape.
 */
function fixJsonStringValues(raw: string): string {
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

// ─── Value Extraction (fallback khi JSON.parse thất bại) ─────────────────────

/**
 * Dùng regex để đọc giá trị của một key trong JSON string —
 * chịu được JSON dang dở hoặc bị escape sai.
 */
function extractStringValue(raw: string, key: string): string {
  // Tìm "key": "..." hoặc "key":"..."
  const pattern = new RegExp(`"${key}"\\s*:\\s*"`, "i");
  const match = pattern.exec(raw);
  if (!match) return "";

  const start = match.index + match[0].length;
  let value = "";
  let esc = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) {
      // Giữ lại escape sequences hợp lệ
      const escMap: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        '"': '"',
        "\\": "\\",
      };
      value += escMap[ch] ?? ch;
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') break;
    value += ch;
  }

  return value.trim();
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse AI response thành GenerateContentResponse.
 * Thử 3 tầng, từ nghiêm ngặt đến thoải mái nhất.
 */
export function parseAIResponse(raw: string): GenerateContentResponse {
  const stripped = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Tầng 1: JSON.parse trực tiếp
  try {
    const parsed = JSON.parse(stripped) as Partial<GenerateContentResponse>;
    if (parsed.content) return normalise(parsed);
  } catch {
    /* tiếp tục */
  }

  // Tầng 2: extractRawJson + fixJsonStringValues
  const extracted = extractRawJson(stripped);
  try {
    const parsed = JSON.parse(
      fixJsonStringValues(extracted),
    ) as Partial<GenerateContentResponse>;
    if (parsed.content) return normalise(parsed);
  } catch {
    /* tiếp tục */
  }

  // Tầng 3: regex trực tiếp — chịu được JSON vỡ hoàn toàn
  console.warn(
    "[Parser] JSON parse failed, using regex fallback. Snippet:",
    raw.slice(0, 80),
  );
  const content =
    extractStringValue(stripped, "content") ||
    extractStringValue(raw, "content");

  if (content) return normalise({ content });

  // Tầng 4: toàn bộ response là text thuần — xảy ra với một số model cũ
  if (!stripped.includes('"content"') && stripped.length > 10) {
    return normalise({ content: stripped });
  }

  throw new Error(
    `AI trả về dữ liệu không đọc được. Snippet: ${raw.slice(0, 120)}`,
  );
}

/** Đảm bảo object luôn có đủ fields và fullPost được trim */
function normalise(
  obj: Partial<GenerateContentResponse>,
): GenerateContentResponse {
  const content = (obj.content ?? "").trim();
  const fullPost = (obj.fullPost ?? content).trim();
  return {
    content: smartTrim(content),
    fullPost: smartTrim(fullPost),
    hashtags: obj.hashtags ?? [],
    topicLabel: obj.topicLabel,
  };
}

/**
 * Cắt thông minh tại dấu cuối câu gần nhất thay vì cắt giữa chừng.
 * Threads giới hạn ~500 ký tự.
 */
export function smartTrim(text: string, limit = 490): string {
  if (text.length <= limit) return text;
  const zone = text.slice(0, limit);
  const lastBreak = Math.max(
    zone.lastIndexOf("."),
    zone.lastIndexOf("!"),
    zone.lastIndexOf("?"),
    zone.lastIndexOf("\n"),
  );
  if (lastBreak > limit * 0.6) return text.slice(0, lastBreak + 1).trim();
  return zone.trimEnd() + "…";
}
