// ============================================================
// /platforms/instagram — Trang Instagram
// ============================================================
import { InstagramIcon } from "@/components/ui/icons";
import { InstagramMonitorBlock } from "@/components/platforms/instagram/monitor";

export const metadata = {
  title: "Instagram — AutoThreads",
};

export default function InstagramPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <InstagramIcon className="w-5 h-5 text-pink-500" />
        <h1 className="text-lg font-bold text-slate-800">Instagram</h1>
      </div>
      
      <InstagramMonitorBlock />
    </div>
  );
}
