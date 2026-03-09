// ============================================================
// Platform Layout — Layout riêng cho /platforms/*/*
// Dùng chung Header + PlatformNav sticky + AutoSchedulerMonitor
// ============================================================

import { Header } from "@/components/layout/header";
import { PlatformNav } from "@/components/layout/platform-nav";
import { PlatformShell } from "@/components/layout/platform-shell";
import { AutoSchedulerMonitor } from "@/components/dashboard/auto-scheduler-monitor";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <Header />
      <PlatformNav />
      <main className="max-w-2xl mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <AutoSchedulerMonitor />
        <PlatformShell>{children}</PlatformShell>
      </main>
    </div>
  );
}
