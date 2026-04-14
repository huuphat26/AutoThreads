import Link from "next/link";
import { SparklesIcon } from "@/components/ui/icons";

export function Header() {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-sm sm:text-base">
            Tự động đăng bài
          </span>
        </Link>
      </div>
    </header>
  );
}
