export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="h-9 w-32 rounded bg-slate-200" />
      </div>
      <div className="mt-4 h-9 w-64 rounded bg-slate-100" />
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-slate-100 px-4 py-3 last:border-0">
            <div className="h-4 flex-1 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
