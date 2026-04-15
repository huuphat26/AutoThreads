"use client";
// ============================================================
// PlatformShell — Client wrapper shared inside /platforms/*
// Cung cấp AIConfigCard + padding chung
// ============================================================

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4">{children}</div>
  );
}
