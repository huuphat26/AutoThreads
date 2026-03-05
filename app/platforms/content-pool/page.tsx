import { ContentPoolPanel } from "@/components/dashboard/content-pool-panel";
import { PoolIcon } from "@/components/ui/icons";

export const metadata = {
  title: "Content Pool — AutoThreads",
};

export default function ContentPoolPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <PoolIcon className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Content Pool</h1>
          <p className="text-xs text-slate-400">
            Nội dung từ Excel — tự động dùng khi lên lịch thay vì generate AI
          </p>
        </div>
      </div>

      <ContentPoolPanel />
    </main>
  );
}
