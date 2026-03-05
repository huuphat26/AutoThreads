import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { importPoolItems } from "@/lib/content-pool";
import { ContentPoolItem, AutoPostSlot } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

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

    // ── Map rows → ContentPoolItem (skip header row) ────────────────────────
    // Column order:
    // 0=Date | 1=Slot | 2=FB Post Time | 3=Threads Post Time | 4=IG Post Time
    // 5=Topic Label | 6=FB Content | 7=Threads Content | 8=IG Caption
    // 9=IG Image URL | 10=Status

    const items: Omit<ContentPoolItem, "id" | "importedAt">[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[0]) continue; // skip empty rows

      const rawDate = String(row[0] ?? "").trim();
      const rawSlot = String(row[1] ?? "").trim().toLowerCase();
      const topicLabel = String(row[5] ?? "").trim();
      const fbContent = String(row[6] ?? "").trim();
      const threadsContent = String(row[7] ?? "").trim();
      const igCaption = String(row[8] ?? "").trim();
      const igImageUrl = String(row[9] ?? "").trim() || undefined;

      // Validate date format yyyy-mm-dd
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        errors.push(`Row ${i + 1}: ngày không hợp lệ "${rawDate}"`);
        continue;
      }

      // Normalize slot
      const slot: AutoPostSlot = rawSlot.includes("noon")
        ? "noon"
        : rawSlot.includes("evening")
          ? "evening"
          : rawSlot === "noon" || rawSlot === "evening"
            ? (rawSlot as AutoPostSlot)
            : null!;

      if (!slot) {
        errors.push(`Row ${i + 1}: slot không hợp lệ "${rawSlot}"`);
        continue;
      }

      if (!fbContent && !threadsContent && !igCaption) {
        errors.push(`Row ${i + 1}: không có nội dung nào`);
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
        status: "pending",
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
          err instanceof Error ? err.message : "Lỗi không xác định khi parse xlsx",
      },
      { status: 500 },
    );
  }
}
