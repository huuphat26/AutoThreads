// ============================================
// Component: ImageAnalyzerCard
//
// Phân tích ảnh qua PuterJS và dùng kết quả làm
// context để tạo nội dung mạng xã hội.
//
// Props:
//   model          — Puter model ID (mặc định "gpt-4o-mini")
//   onUseAnalysis  — callback khi user nhấn "Dùng để tạo bài"
//                    nhận về chuỗi mô tả ảnh
// ============================================
"use client";

import { useState } from "react";
import { usePuterImageAnalyze } from "@/hooks/use-puter-image-analyze";
import { Spinner } from "@/components/ui/spinner";
import {
  PhotoIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XCircleIcon,
} from "@/components/ui/icons";

type Props = {
  model?: string;
  /** Callback khi user muốn dùng kết quả phân tích làm customPrompt */
  onUseAnalysis?: (analysis: string) => void;
};

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-transparent";

export function ImageAnalyzerCard({ model = "gpt-4o-mini", onUseAnalysis }: Props) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPromptField, setShowPromptField] = useState(false);

  const { analyzing, result, error, analyze, reset } = usePuterImageAnalyze();

  const handleAnalyze = async () => {
    if (!imageUrl.trim()) return;
    await analyze(imageUrl.trim(), {
      model,
      prompt: customPrompt.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setImageUrl("");
    setCustomPrompt("");
    reset();
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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
            <PhotoIcon className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Tạo ảnh bằng AI</p>
            <p className="text-xs text-slate-400">Phân tích ảnh → dùng làm context tạo bài</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <span className="text-[10px] font-medium bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
              Đã phân tích
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
        <div className="px-5 pb-5 space-y-4 border-t border-violet-50 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Image URL input */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              URL hình ảnh
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  if (result) reset();
                }}
                placeholder="https://example.com/image.jpg"
                className={inputClass}
              />
              {imageUrl && (
                <button
                  onClick={handleClear}
                  className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Xóa"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Image preview */}
          {imageUrl && isValidUrl(imageUrl) && (
            <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
                className="w-full max-h-48 object-contain"
              />
            </div>
          )}

          {/* Custom prompt toggle */}
          <div>
            <button
              onClick={() => setShowPromptField((v) => !v)}
              className="text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1 transition-colors"
            >
              {showPromptField ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
              {showPromptField ? "Ẩn tùy chỉnh câu hỏi" : "Tùy chỉnh câu hỏi phân tích"}
            </button>

            {showPromptField && (
              <div className="mt-2 animate-in fade-in duration-150">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  placeholder="Mặc định: Mô tả chi tiết hình ảnh bằng tiếng Việt..."
                  className={`${inputClass} resize-none text-xs`}
                />
              </div>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !imageUrl.trim()}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {analyzing ? (
              <>
                <Spinner />
                <span>Đang phân tích...</span>
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span>Phân tích ảnh</span>
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl">
              <XCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500">Kết quả phân tích</p>
                <button
                  onClick={handleCopy}
                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  {copied ? "Đã copy!" : "Copy"}
                </button>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                {result}
              </div>

              {onUseAnalysis && (
                <button
                  onClick={() => onUseAnalysis(result)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors shadow-sm"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Dùng để tạo bài bằng AI
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
