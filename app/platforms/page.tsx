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
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-800">Mạng xã hội</h1>
        <p className="text-sm text-slate-500">
          Theo dõi nhanh tài khoản và trạng thái đăng tự động trong ngày.
        </p>
      </div>

      <PlatformOverview />

      <AutoSchedulerMonitor />
    </div>
  );
}
