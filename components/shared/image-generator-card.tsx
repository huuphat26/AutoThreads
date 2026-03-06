// ============================================
// Component: ImageGeneratorCard
//
// Tạo ảnh từ text prompt qua Puter.js (txt2img).
// Khi ảnh được tạo thành công, gọi onImageGenerated(url)
// để set imageUrl vào compose form.
// ============================================
"use client";

import { useState } from "react";
import { usePuterImageGenerate } from "@/hooks/use-puter-image-generate";
import { Spinner } from "@/components/ui/spinner";
import {
  PhotoIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/ui/icons";

type Props = {
  /** Callback khi ảnh đã tạo xong — truyền URL vào imageUrl của compose form */
  onImageGenerated?: (url: string) => void;
};

export function ImageGeneratorCard({ onImageGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const { generating, uploading, imageUrl, error, usedModel, generate, reset, PUTER_IMAGE_MODELS } =
    usePuterImageGenerate();

  const [selectedModel, setSelectedModel] = useState<string>(PUTER_IMAGE_MODELS[0]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const url = await generate(prompt.trim(), selectedModel);
    if (url && onImageGenerated) {
      onImageGenerated(url);
    }
  };

  const handleClear = () => {
    setPrompt("");
    reset();
  };

  return (
    <section className="border border-violet-100 rounded-2xl overflow-hidden bg-white shadow-sm">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-violet-50 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
            <SparklesIcon className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Tạo ảnh bằng AI</p>
            <p className="text-xs text-slate-400">Nhập prompt → tạo ảnh → dùng cho bài đăng</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <span className="text-[10px] font-medium bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
              Đã upload Cloudinary
            </span>
          )}
          {open ? (
            <ChevronUpIcon className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-violet-50 pt-4">
          {/* Prompt input */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Image Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ví dụ: A serene Vietnamese coffee shop at dawn, warm light, cinematic..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-transparent resize-none"
            />
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">Model:</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={generating}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:opacity-50"
            >
              {PUTER_IMAGE_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 italic">
              (tự thử model tiếp theo nếu lỗi)
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || uploading || !prompt.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {(generating || uploading) ? <Spinner /> : <PhotoIcon className="w-4 h-4" />}
              {generating ? "Puter đang tạo ảnh..." : uploading ? "Đang upload Cloudinary..." : "Tạo ảnh"}
            </button>
            {(imageUrl || prompt) && (
              <button
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Xoá
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Result */}
          {imageUrl && (
            <div className="space-y-2">
              {usedModel && (
                <p className="text-[10px] text-violet-500 italic">✓ {usedModel} → Cloudinary</p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="AI generated"
                className="rounded-xl w-full max-h-64 object-cover border border-violet-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onImageGenerated?.(imageUrl)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Dùng ảnh này cho bài đăng
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Xem ảnh
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
