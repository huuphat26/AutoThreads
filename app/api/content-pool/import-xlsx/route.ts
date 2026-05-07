import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { importPoolItems, previewPoolImport } from "@/lib/content-pool";
import { ContentPoolItem, AutoPostSlot } from "@/types";
import { canUsePrivilegedRoute } from "@/lib/server/request-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!canUsePrivilegedRoute(req)) {
    return NextResponse.json(
      { success: false, error: "Không có quyền truy cập" },
      { status: 401 },
    );
  }

  try {
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
    const isDayBased =
      headerRow[0]?.toLowerCase() === "day" ||
      headerRow[0]?.toLowerCase() === "ngày";

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
      if (!row || (!row[0] && !row[1])) continue; // skip empty rows
      const rowNumber = i + 1;

      let rawDate = "";
      let slot: AutoPostSlot = "evening";
      let topicLabel = "";
      let caption = "";
      let hashtags = "";
      let rawImageUrl = "";
      let imagePrompt: string | undefined = undefined;

      if (isDayBased) {
        // --- NEW FORMAT (Day-based) ---
        // 0=Day (Date or Num) | 1=Topic | 2=Hook | 3=Content | 4=CTA | 5=Hashtags | 6=Url Image
        const rawDay = String(row[0] ?? "").trim();
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDay)) {
          // Parse DD/MM/YYYY
          const [d, m, y] = rawDay.split("/").map(Number);
          rawDate = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDay)) {
          rawDate = rawDay.split(" ")[0];
        } else {
          // Offset based
          const dayNum = parseInt(rawDay || "1");
          const d = new Date(today);
          d.setDate(d.getDate() + (dayNum - 1));
          rawDate = d.toISOString().split("T")[0];
        }

        slot = "evening"; // Forced evening as requested
        topicLabel = String(row[1] ?? "").trim();
        const hook = String(row[2] ?? "").trim();
        const body = String(row[3] ?? "").trim();
        const cta = String(row[4] ?? "").trim();

        // Ghép nội dung theo thứ tự: Topic -> Hook -> Content -> CTA
        caption = [topicLabel, hook, body, cta].filter(Boolean).join("\n\n");
        hashtags = String(row[5] ?? "").trim();
        rawImageUrl = String(row[6] ?? "").trim();
        imagePrompt = undefined; // Column G is Url Image, no prompt in this format
      } else {
        // --- STANDARD FORMAT ---
        // 0=Date | 1=Slot | 5=Title | 8=Caption | 9=Hashtags | 10=Image_URL | 11=Image_Prompt
        rawDate = String(row[0] ?? "").trim();

        slot = "evening";

        topicLabel = String(row[5] ?? "").trim();
        caption = String(row[8] ?? "").trim();
        hashtags = String(row[9] ?? "").trim();
        rawImageUrl = String(row[10] ?? "").trim();
        imagePrompt = String(row[11] ?? "").trim() || undefined;
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
