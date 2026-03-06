import { ContentPoolItem } from "@/types";
import { SparklesIcon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { BulkProgress } from "./use-content-pool";

// ── Banner: today has items needing images ─────────────────────
interface NeedsBannerProps {
  items: ContentPoolItem[];
  onGenerate: (items: ContentPoolItem[]) => void;
}

export function BulkNeedsBanner({ items, onGenerate }: NeedsBannerProps) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <div className="flex-1 text-[11px] text-amber-800">
        <span className="font-bold">⚠️ {items.length} bài hôm nay</span> chưa có ảnh
        — sẽ tự động tạo trước giờ đăng.
      </div>
      <button
        onClick={() => onGenerate(items)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
      >
        <SparklesIcon className="w-3 h-3" />
        Tạo ngay ({items.length})
      </button>
    </div>
  );
}

// ── Progress bar while bulk generating ────────────────────────
interface ProgressProps {
  progress: BulkProgress;
}

export function BulkProgressBar({ progress }: ProgressProps) {
  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <Spinner />
        <span className="text-[11px] text-violet-700 font-semibold">
          Đang tạo ảnh {progress.current}/{progress.total}…
        </span>
        <span className="text-[10px] text-violet-400 ml-auto">{pct}%</span>
      </div>
      <div className="w-full bg-violet-100 rounded-full h-1.5">
        <div
          className="bg-violet-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progress.errors.length > 0 && (
        <p className="text-[10px] text-red-500">
          ⚠️ Lỗi: {progress.errors.join(", ")}
        </p>
      )}
    </div>
  );
}

// ── Summary after bulk generation finishes ─────────────────────
interface SummaryProps {
  progress: BulkProgress;
  onDismiss: () => void;
}

export function BulkSummary({ progress, onDismiss }: SummaryProps) {
  if (progress.current === 0) return null;
  const ok = progress.current - progress.errors.length;

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
      <span className="text-[11px] text-green-700">
        ✅ Hoàn tất: <strong>{ok}</strong> ảnh đã lưu
        {progress.errors.length > 0 && (
          <span className="text-red-500"> | ⚠️ {progress.errors.length} lỗi</span>
        )}
      </span>
      <button
        onClick={onDismiss}
        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
      >
        Ẩn
      </button>
    </div>
  );
}
