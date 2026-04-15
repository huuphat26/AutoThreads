import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { importPoolItems } from "@/lib/content-pool";
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

    // ── Map rows → ContentPoolItem (skip header row) ————————————————
    // Column order (new format):
    // 0=Date | 1=Slot (morning/lunch/evening) | 2=FB Post Time
    // 3=Threads Post Time | 4=IG Post Time | 5=Title (topicLabel)
    // 6=Dish Name (skip) | 7=Ingredients (skip) | 8=Caption_Formatted
    // 9=Hashtags | 10=Image_URL | 11=Image_Prompt

    const items: Omit<ContentPoolItem, "id" | "importedAt">[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // skip empty rows

      const rawDate = String(row[0] ?? "").trim();
      const rawSlot = String(row[1] ?? "")
        .trim()
        .toLowerCase();
      const topicLabel = String(row[5] ?? "").trim();
      const caption = String(row[8] ?? "").trim();
      const hashtags = String(row[9] ?? "").trim();
      const rawImageUrl = String(row[10] ?? "").trim();
      const imagePrompt = String(row[11] ?? "").trim() || undefined;
      const igImageUrl: string | undefined =
        rawImageUrl && rawImageUrl !== "None" && rawImageUrl.startsWith("http")
          ? rawImageUrl
          : undefined;

      // Assemble platform content from caption + hashtags
      const fbContent = hashtags ? `${caption}\n\n${hashtags}` : caption;
      const threadsContent =
        caption.length > 480 ? caption.slice(0, 477) + "..." : caption;
      const igCaption = hashtags
        ? `${caption.slice(0, 250)}\n\n${hashtags}`
        : caption.slice(0, 250);
      // igImageUrl already set above from Image_URL column

      // Validate date format yyyy-mm-dd
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        errors.push(`Row ${i + 1}: ngày không hợp lệ "${rawDate}"`);
        continue;
      }

      // Normalize slot: Excel dùng "morning"/"lunch"/"evening"
      const slot: AutoPostSlot =
        rawSlot === "morning" ||
        rawSlot === "sang" ||
        rawSlot.includes("morning")
          ? "morning"
          : rawSlot === "lunch" ||
              rawSlot === "noon" ||
              rawSlot === "trua" ||
              rawSlot.includes("noon") ||
              rawSlot.includes("lunch")
            ? "lunch"
            : rawSlot === "evening" ||
                rawSlot === "toi" ||
                rawSlot.includes("evening")
              ? "evening"
              : null!;

      if (!slot) {
        errors.push(`Row ${i + 1}: slot không hợp lệ "${rawSlot}"`);
        continue;
      }

      if (!fbContent && !threadsContent && !igCaption) {
        errors.push(`Row ${i + 1}: caption trống`);
        continue;
      }

      items.push({
        date: rawDate,
        slot,
        topicLabel: topicLabel || "No Topic",
        fbContent,
        threadsContent,
        igCaption,
        igImageUrl,
        imagePrompt,
        status: "pending",
        accountId,
      });
    }

    const result = importPoolItems(items);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        totalRows: rows.length - 1,
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
