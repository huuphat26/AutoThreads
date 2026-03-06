"use client";

import { STATUS_CFG, type StatusKey } from "./types";

export function Dot({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`}
    />
  );
}

export function Pill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as StatusKey] ?? STATUS_CFG.skipped;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${cfg.pill}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
