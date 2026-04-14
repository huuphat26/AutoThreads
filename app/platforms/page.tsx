// ============================================================
// /platforms — Trang Mạng xã hội (Overview cả 3 platforms)
// ============================================================
import { PlatformOverview } from "@/components/dashboard/platform-overview";
import { AutoSchedulerMonitor } from "@/components/dashboard/auto-scheduler-monitor";

export const metadata = {
  title: "Mạng xã hội — AutoThreads",
};

export default function SocialMediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-slate-800">Mạng xã hội</h1>
      </div>
      
      <PlatformOverview />
      
      <AutoSchedulerMonitor />
    </div>
  );
}
