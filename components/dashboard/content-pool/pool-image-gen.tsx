"use client";

import { useState } from "react";
import { ContentPoolItem } from "@/types";
import { PhotoIcon, SparklesIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { usePuterImageGenerate } from "@/hooks/use-puter-image-generate";

interface Props {
  item: ContentPoolItem;
  onSaved: () => void;
}

export function PoolImageGen({ item, onSaved }: Props) {
  const {
    generating,
    uploading,
    imageUrl,
    error,
    usedModel,
    generate,
    reset,
    PUTER_IMAGE_MODELS,
  } = usePuterImageGenerate();

  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState(item.igImageUrl ?? "");
  const [selectedModel, setSelectedModel] = useState<string>(PUTER_IMAGE_MODELS[0]);

  if (!item.imagePrompt) return null;

  const handleSave = async (url: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/content-pool", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, igImageUrl: url }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedUrl(url);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  const isBusy = generating || uploading;

  return (
    <div className="mt-2 border border-violet-100 rounded-lg bg-violet-50/40 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <SparklesIcon className="w-3 h-3 text-violet-500" />
        <p className="text-[10px] font-semibold text-violet-700">Image Prompt (AI)</p>
      </div>

      <p className="text-[10px] text-slate-500 italic leading-relaxed">
        {item.imagePrompt}
      </p>

      {/* Model selector */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-slate-500 shrink-0">Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isBusy}
          className="text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:opacity-50"
        >
          {PUTER_IMAGE_MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-[9px] text-slate-400 italic">
          (tự thử model tiếp theo nếu lỗi)
        </span>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => generate(item.imagePrompt!, selectedModel)}
          disabled={isBusy}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {isBusy ? <Spinner /> : <PhotoIcon className="w-3 h-3" />}
          {generating ? "Puter đang tạo ảnh..." : uploading ? "Đang upload..." : "Tạo ảnh AI"}
        </button>

        {imageUrl && (
          <button
            onClick={reset}
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Xoá
          </button>
        )}

        {usedModel && imageUrl && (
          <span className="text-[9px] text-violet-500 italic">
            ✓ {usedModel} → Cloudinary
          </span>
        )}

        {savedUrl && !imageUrl && (
          <span className="text-[10px] text-green-600 font-medium">✓ Đã lưu ảnh IG</span>
        )}
      </div>

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      {/* Preview + save */}
      {imageUrl && (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="AI generated"
            className="rounded-lg w-full max-h-48 object-cover border border-violet-200"
          />
          <div className="flex gap-2 flex-wrap">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-violet-300 text-violet-700 hover:bg-violet-100 transition-colors"
            >
              Xem ảnh
            </a>
            <button
              onClick={() => handleSave(imageUrl)}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Spinner />}
              Lưu làm ảnh IG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
