// ── Reusable skeleton pulse block ─────────────────────────────
function Bone({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
  );
}

// ── Stats bar: 4 metric cards ──────────────────────────────────
export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex flex-col gap-2 items-center">
          <Bone className="h-6 w-12" />
          <Bone className="h-2.5 w-16" />
          <Bone className="h-2 w-10" />
        </div>
      ))}
    </div>
  );
}

// ── Single item card skeleton ───────────────────────────────────
function ItemCardSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-3">
        <Bone className="h-4 w-10 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Bone className="h-3.5 w-28" />
            <Bone className="h-4 w-14 ml-auto rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Bone className="h-8 rounded-md" />
            <Bone className="h-8 rounded-md" />
            <Bone className="h-8 rounded-md" />
          </div>
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-4 w-4 shrink-0 mt-0.5 rounded" />
      </div>
    </div>
  );
}

// ── Full item list skeleton (date group + 2 items) ─────────────
export function ItemListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {/* date header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <Bone className="h-3.5 w-32" />
            <Bone className="h-4 w-12 rounded-md" />
            <Bone className="h-4 w-16 rounded-md" />
          </div>
          {Array.from({ length: gi === 0 ? 3 : 2 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </div>
      ))}
    </div>
  );
}
