// ============================================================
// /platforms/facebook — Trang Facebook
// ============================================================
import { FacebookIcon } from "@/components/ui/icons";
import { FacebookMonitorBlock } from "@/components/platforms/facebook/monitor";

export const metadata = {
  title: "Facebook — AutoThreads",
};

export default function FacebookPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FacebookIcon className="w-5 h-5 text-[#1877F2]" />
        <h1 className="text-lg font-bold text-slate-800">Facebook</h1>
      </div>
      
      <FacebookMonitorBlock />
    </div>
  );
}
