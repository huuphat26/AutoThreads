// ============================================================
// API: POST /api/upload-image
// Nhận ảnh từ browser (dưới dạng FormData + field "file"),
// upload lên Cloudinary, trả về HTTPS public URL.
//
// Dùng FormData (không dùng JSON) để xử lý ảnh lớn hơn 4MB.
// API key/secret Cloudinary giữ trong .env — không bao giờ lộ ra browser.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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
    const imageDataUrl = formData.get("imageData") as string | null;

    if (!file && !imageDataUrl) {
      return NextResponse.json(
        { success: false, error: "Thiếu file hoặc imageData" },
        { status: 400 },
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "autothreads";

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cloudinary chưa được cấu hình. Kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env",
        },
        { status: 500 },
      );
    }

    // Tạo chữ ký cho signed upload
    const timestamp = Math.round(Date.now() / 1000);
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(signatureStr)
      .digest("hex");

    const body = new FormData();
    if (file) {
      body.append("file", file);
    } else {
      // base64 data URL — Cloudinary chấp nhận trực tiếp
      body.append("file", imageDataUrl!);
    }
    body.append("api_key", apiKey);
    body.append("timestamp", String(timestamp));
    body.append("signature", signature);
    body.append("folder", folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body },
    );

    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `Cloudinary lỗi ${res.status}`);
    }

    const data = (await res.json()) as {
      secure_url: string;
      public_id: string;
    };

    return NextResponse.json({
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    });
  } catch (err) {
    console.error("[upload-image]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Upload thất bại",
      },
      { status: 500 },
    );
  }
}
