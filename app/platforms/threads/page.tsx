// ============================================================
// /platforms/threads — Trang Threads
// ============================================================
import { ThreadsIcon } from "@/components/ui/icons";
import { ThreadsMonitorBlock } from "@/components/platforms/threads/monitor";

export const metadata = {
  title: "Threads — AutoThreads",
};

export default function ThreadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ThreadsIcon className="w-5 h-5 text-slate-800" />
        <h1 className="text-lg font-bold text-slate-800">Threads</h1>
      </div>
      
      <ThreadsMonitorBlock />
    </div>
  );
}
