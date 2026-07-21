import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { importPoolItems, previewPoolImport } from "@/lib/content-pool";
import { ContentPoolItem, AutoPostSlot } from "@/types";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";
import { initAllStores } from "@/lib/services/store-initializer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
    await initAllStores();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const accountId = (formData.get("accountId") as string | null) || undefined;
    const dryRun =
      (formData.get("dryRun") as string | null) === "1" ||
      (formData.get("dryRun") as string | null) === "true";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy file trong form data" },
        { status: 400 },
      );
    }

    // ── Parse xlsx ─────────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

    const sheetName =
      workbook.SheetNames.find((n) =>
        n.toLowerCase().includes("autothreads"),
      ) ?? workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
    }) as unknown[][];

    const headerRow = (rows[0] || []) as string[];
    
    // Map headers to column indices
    const headerMap = new Map<string, number>();
    headerRow.forEach((val, idx) => {
      if (val) headerMap.set(String(val).trim().toLowerCase(), idx);
    });

    const getColIndex = (keys: string[]): number => {
      for (const key of keys) {
        const k = key.toLowerCase();
        for (const [header, idx] of headerMap.entries()) {
          if (header === k || header.includes(k)) {
            return idx;
          }
        }
      }
      return -1;
    };

    const idxDay = getColIndex(["day", "date", "ngày"]);
    const idxTopic = getColIndex(["topic", "chủ đề", "title", "tiêu đề"]);
    const idxHook = getColIndex(["hook"]);
    const idxContent = getColIndex(["content", "nội dung", "caption", "body"]);
    const idxCTA = getColIndex(["cta"]);
    const idxHashtags = getColIndex(["hashtags", "hashtag"]);
    const idxImageUrl = getColIndex(["url image", "image url", "image_url", "ảnh", "hình ảnh"]);
    const idxImagePrompt = getColIndex(["image_prompt", "image prompt", "prompt"]);

    const items: Omit<ContentPoolItem, "id" | "importedAt">[] = [];
    const rowErrors: Array<{ row: number; message: string }> = [];
    const previewRows: Array<{
      row: number;
      date: string;
      slot: AutoPostSlot;
      topicLabel: string;
      hasImageUrl: boolean;
      hasImagePrompt: boolean;
    }> = [];

    const pushRowError = (row: number, message: string) => {
      rowErrors.push({ row, message });
    };

    // Calculate start date for Day-based format (today)
    const today = new Date();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue; // skip empty rows
      const rowNumber = i + 1;

      // Extract raw strings from row based on column indices
      const getVal = (idx: number): string => {
        if (idx === -1 || idx >= row.length) return "";
        return String(row[idx] ?? "").trim();
      };

      const rawDay = getVal(idxDay);
      if (!rawDay && !getVal(idxContent)) continue; // skip empty rows

      let rawDate = "";
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDay)) {
        // Parse DD/MM/YYYY
        const [d, m, y] = rawDay.split("/").map(Number);
        rawDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDay)) {
        rawDate = rawDay.split(" ")[0];
      } else {
        // Offset based
        const dayNum = parseInt(rawDay || "1");
        if (!isNaN(dayNum)) {
          const d = new Date(today);
          d.setDate(d.getDate() + (dayNum - 1));
          rawDate = d.toISOString().split("T")[0];
        } else {
          pushRowError(rowNumber, `Ngày không hợp lệ "${rawDay}"`);
          continue;
        }
      }

      const slot: AutoPostSlot = "evening"; // Forced evening as requested

      const hook = getVal(idxHook);
      const content = getVal(idxContent);
      const cta = getVal(idxCTA);
      const hashtags = getVal(idxHashtags);
      const rawImageUrl = getVal(idxImageUrl);
      let imagePrompt = idxImagePrompt !== -1 ? getVal(idxImagePrompt) : undefined;
      if (imagePrompt === "") imagePrompt = undefined;

      // Set topicLabel to Topic/Title column if present, otherwise fall back to Hook (the headline)
      let topicLabel = "";
      const idxTopic = getColIndex(["topic", "chủ đề", "title", "tiêu đề"]);
      if (idxTopic !== -1) {
        topicLabel = getVal(idxTopic);
      } else {
        topicLabel = hook || "Ép Xanh";
      }

      // Construct caption (Hook -> Content -> CTA or just content)
      let caption = "";
      if (idxHook !== -1 || idxContent !== -1 || idxCTA !== -1) {
        caption = [hook, content, cta].filter(Boolean).join("\n\n");
      } else {
        caption = getVal(idxContent); // Fallback to content column
      }

      const igImageUrl: string | undefined =
        rawImageUrl && rawImageUrl !== "None" && rawImageUrl.startsWith("http")
          ? rawImageUrl
          : undefined;

      // Assemble platform content
      const fbContent = hashtags ? `${caption}\n\n${hashtags}` : caption;

      // Threads: Giới hạn ~500 ký tự (API)
      let threadsContent = hashtags ? `${caption}\n\n${hashtags}` : caption;
      if (threadsContent.length > 490) {
        threadsContent =
          caption.length > 490 ? caption.slice(0, 487) + "..." : caption;
      }

      // Instagram: Tối đa 2200 ký tự
      const igCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;
      const finalIgCaption =
        igCaption.length > 2100 ? igCaption.slice(0, 2097) + "..." : igCaption;

      // Validate date format yyyy-mm-dd
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        pushRowError(rowNumber, `Ngày không hợp lệ "${rawDate}"`);
        continue;
      }

      if (!slot) {
        pushRowError(rowNumber, `Slot không hợp lệ "${row[1]}"`);
        continue;
      }

      if (!fbContent && !threadsContent && !igCaption) {
        pushRowError(rowNumber, "Caption trống");
        continue;
      }

      items.push({
        date: rawDate,
        slot,
        topicLabel: topicLabel || "No Topic",
        fbContent,
        threadsContent,
        igCaption: finalIgCaption,
        igImageUrl,
        imagePrompt,
        status: "pending",
        accountId,
      });

      previewRows.push({
        row: rowNumber,
        date: rawDate,
        slot,
        topicLabel: topicLabel || "No Topic",
        hasImageUrl: Boolean(igImageUrl),
        hasImagePrompt: Boolean(imagePrompt),
      });
    }

    const errors = rowErrors.map((e) => `Row ${e.row}: ${e.message}`);

    if (dryRun) {
      const impact = previewPoolImport(items);
      return NextResponse.json({
        success: true,
        data: {
          dryRun: true,
          totalRows: rows.length - 1,
          validRows: items.length,
          ...impact,
          previewRows: previewRows.slice(0, 20),
          rowErrors,
          errors,
        },
      });
    }

    const result = importPoolItems(items);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        totalRows: rows.length - 1,
        validRows: items.length,
        rowErrors,
        errors,
      },
    });
  } catch (err) {
    console.error("[import-xlsx] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Lỗi không xác định khi parse xlsx",
      },
      { status: 500 },
    );
  }
}
