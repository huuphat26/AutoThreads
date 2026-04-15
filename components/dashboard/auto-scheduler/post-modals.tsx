"use client";

import { useEffect } from "react";
import type { AutoPostPlatformResult } from "@/types";

// ─── Backdrop ─────────────────────────────────────────────────

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Error hint parser ────────────────────────────────────────

function parseErrorHint(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("token") || m.includes("access") || m.includes("oauth") || m.includes("auth"))
    return "Token truy cập hết hạn hoặc không hợp lệ. Hãy làm mới token.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Vượt giới hạn gọi API. Thử lại sau vài phút.";
  if (m.includes("image") || m.includes("media") || m.includes("url"))
    return "Lỗi liên quan đến ảnh/media. Kiểm tra URL ảnh có hợp lệ không.";
  if (m.includes("caption") || m.includes("text") || m.includes("content"))
    return "Nội dung bài đăng vi phạm chính sách hoặc quá dài.";
  if (m.includes("network") || m.includes("fetch") || m.includes("timeout") || m.includes("econnrefused"))
    return "Lỗi kết nối mạng. Kiểm tra server và internet.";
  if (m.includes("404") || m.includes("not found"))
    return "Endpoint API không tồn tại. Kiểm tra cấu hình.";
  if (m.includes("500") || m.includes("internal"))
    return "Lỗi server phía nền tảng. Thử lại sau.";
  if (m.includes("permission") || m.includes("scope"))
    return "Thiếu quyền truy cập. Kiểm tra scope của token.";
  return "Lỗi không xác định. Xem chi tiết mã lỗi bên dưới.";
}

// ─── Error modal ──────────────────────────────────────────────

export function ErrorModal({
  platform,
  result,
  onClose,
}: {
  platform: string;
  result: AutoPostPlatformResult;
  onClose: () => void;
}) {
  const hint = parseErrorHint(result.errorMessage ?? "");
  return (
    <Modal onClose={onClose}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          <span className="text-sm font-semibold text-slate-700">
            Lỗi đăng bài — {platform}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-slate-500 text-lg leading-none"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1">
            Nguyên nhân có thể
          </p>
          <p className="text-sm text-amber-800">{hint}</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wide mb-2">
            Mã lỗi chi tiết
          </p>
          <pre className="text-[11px] text-rose-700 whitespace-pre-wrap break-all font-mono leading-relaxed">
            {result.errorMessage}
          </pre>
        </div>
        {result.postId && (
          <p className="text-[11px] text-slate-400">
            Post ID: <span className="font-mono">{result.postId}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Success modal ────────────────────────────────────────────

export function SuccessModal({
  platform,
  result,
  onClose,
}: {
  platform: string;
  result: AutoPostPlatformResult;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-sm font-semibold text-slate-700">
            Đã đăng — {platform}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-slate-500 text-lg leading-none"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 space-y-2">
          {result.postedAt && (
            <p className="text-sm text-emerald-700">
              ✓ Đăng lúc{" "}
              <span className="font-semibold">
                {new Date(result.postedAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {result.postId && (
            <p className="text-[11px] text-emerald-600">
              Post ID: <span className="font-mono">{result.postId}</span>
            </p>
          )}
        </div>
        {result.permalinkUrl ? (
          <a
            href={result.permalinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Xem bài đăng ↗
          </a>
        ) : (
          <p className="text-center text-[11px] text-slate-400">
            Không có link trực tiếp đến bài đăng
          </p>
        )}
      </div>
    </Modal>
  );
}
