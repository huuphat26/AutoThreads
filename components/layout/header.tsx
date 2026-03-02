import type { ProviderInfo } from "@/types";
import { ChatBubbleIcon } from "@/components/ui/icons";

type Props = {
  aiProvider?: ProviderInfo;
};

export function Header({ aiProvider }: Props) {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <ChatBubbleIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight">
            AutoThreads
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI model badge */}
          {aiProvider && (
            <div
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border"
              style={{
                background: aiProvider.available ? "#f8fafc" : "#fef2f2",
                borderColor: aiProvider.available ? "#e2e8f0" : "#fecaca",
                color: aiProvider.available ? "#64748b" : "#ef4444",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background: aiProvider.available ? "#34d399" : "#f87171",
                }}
              />
              <span className="font-medium">{aiProvider.model}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
