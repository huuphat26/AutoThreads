// Header — sticky navigation bar
import type { ProviderInfo, SchedulerStatus } from "@/types";
import { ChatBubbleIcon } from "@/components/ui/icons";

type Props = {
  aiProvider?: ProviderInfo;
  schedulerStatus?: SchedulerStatus | null;
};

export function Header({ aiProvider, schedulerStatus }: Props) {
  const isRunning = schedulerStatus?.running ?? null;
  const isTestMode = schedulerStatus?.testMode ?? false;

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

        {/* Right badges */}
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

          {/* Scheduler badge — real live status */}
          {isRunning === null ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 inline-block" />
              ...
            </div>
          ) : isRunning ? (
            <div
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border font-medium ${
                isTestMode
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <span className="relative flex w-1.5 h-1.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isTestMode ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full w-1.5 h-1.5 ${
                    isTestMode ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              {isTestMode ? "Test" : "Scheduler"}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border bg-rose-50 border-rose-200 text-rose-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
              Dừng
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
