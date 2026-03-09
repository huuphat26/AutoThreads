// ============================================================
// Server-side Cloudinary utilities for auto-scheduler.
// Validates image URLs (HEAD request as Meta's crawlers would)
// and uploads them to Cloudinary to get a stable, Meta-approved URL.
//
// Why upload to Cloudinary?
//   Pinterest, Rawpixel and many CDNs block requests from automated
//   servers (403/404). Meta's crawlers are also automated and hit
//   the same blocks (→ Meta 324 / Meta 1). Cloudinary re-hosts
//   the image at a stable HTTPS URL that Meta always accepts.
// ============================================================
import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "autothreads";

/** Returns true if this URL is already hosted on Cloudinary (no re-upload needed). */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com");
}

/**
 * Validate an image URL by sending a HEAD request simulating Meta's crawler.
 * Falls back to a partial GET (Range: bytes=0-0) if HEAD is blocked (405 / 403).
 * Returns true if the URL responds with HTTP 2xx and Content-Type: image/*.
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  const META_UA =
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

  // 1st attempt: HEAD (fast, no body)
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": META_UA },
    });
    if (res.ok) {
      const ct = res.headers.get("content-type") ?? "";
      // Some CDNs return 200 HEAD with no Content-Type; treat as possibly valid image
      if (ct.startsWith("image/") || ct === "") return true;
    }
    // 405 Method Not Allowed or 403 Forbidden → try GET fallback
    if (res.status !== 405 && res.status !== 403) {
      return false;
    }
  } catch {
    // Network error on HEAD → try GET fallback
  }

  // 2nd attempt: GET with Range header to avoid downloading the full file
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": META_UA, Range: "bytes=0-255" },
    });
    // 206 Partial Content or 200 OK — both acceptable
    if (res.status === 200 || res.status === 206) {
      const ct = res.headers.get("content-type") ?? "";
      // Accept if content-type is image, or empty (some CDNs skip it on range requests)
      return ct.startsWith("image/") || ct === "";
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Upload an image to Cloudinary by its public URL.
 * Cloudinary fetches the image itself — no binary transfer needed.
 * Returns the secure_url (HTTPS, CDN-served, always accessible by Meta).
 *
 * @throws Error if Cloudinary is not configured or upload fails.
 */
export async function uploadImageUrlToCloudinary(
  imageUrl: string,
): Promise<string> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      "Cloudinary chưa cấu hình. Kiểm tra CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET trong .env",
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signatureStr = `folder=${FOLDER}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureStr)
    .digest("hex");

  const body = new FormData();
  body.append("file", imageUrl); // Cloudinary remote URL upload
  body.append("api_key", API_KEY);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", FOLDER);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body, signal: AbortSignal.timeout(30_000) },
  );

  if (!res.ok) {
    const err = (await res.json()) as { error?: { message?: string } };
    throw new Error(
      `Cloudinary upload thất bại: ${err.error?.message ?? `HTTP ${res.status}`}`,
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
