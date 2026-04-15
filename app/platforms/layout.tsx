// ============================================================
// Platform Layout — Layout riêng cho /platforms/*
// Header + PlatformNav + Content
// ============================================================

import { Header } from "@/components/layout/header";
import { PlatformNav } from "@/components/layout/platform-nav";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      <PlatformNav />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
