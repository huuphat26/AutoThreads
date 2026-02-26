// Header — sticky navigation bar
import { ChatBubbleIcon } from "@/components/ui/icons";

export function Header() {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <ChatBubbleIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">
            AutoThreads - Ép Xanh Chữa Lành
          </span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Scheduler đang chạy
        </div>
      </div>
    </header>
  );
}
