// ============================================================
// Browser utility: uploadImageToCloud
//
// Sau khi Puter tạo ảnh (trả về blob: URL hoặc data: URL),
// gọi hàm này để upload lên Cloudinary qua server API.
// Trả về HTTPS public URL — dùng được cho FB, Threads, IG.
//
// Dùng FormData (không dùng JSON) để xử lý file ảnh lớn (>4MB).
// ============================================================

/**
 * Upload ảnh lên Cloudinary thông qua /api/upload-image.
 * Hỗ trợ blob URL, data URL, File object.
 * @returns HTTPS Cloudinary URL
 */
export async function uploadImageToCloud(src: string | File): Promise<string> {
  const formData = new FormData();

  if (src instanceof File) {
    formData.append("file", src);
  } else if (src.startsWith("blob:")) {
    // blob: URL → fetch → Blob → File (gửi as multipart)
    const blob = await fetch(src).then((r) => r.blob());
    formData.append("file", new File([blob], "ai-image.png", { type: blob.type || "image/png" }));
  } else if (src.startsWith("data:")) {
    // data: URL → gửi trực tiếp như string (Cloudinary chấp nhận)
    formData.append("imageData", src);
  } else {
    // https: URL — không cần upload lại
    return src;
  }

  const res = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  });

  const json = (await res.json()) as {
    success: boolean;
    url?: string;
    error?: string;
  };

  if (!json.success || !json.url) {
    throw new Error(json.error ?? "Upload Cloudinary thất bại");
  }

  return json.url;
}
