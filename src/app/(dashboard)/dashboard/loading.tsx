export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="h-6 w-48 rounded bg-surface-sunken" />
      <div className="mt-2 h-4 w-28 rounded bg-surface-sunken" />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[6.5rem] rounded-xl border border-border bg-surface-raised" />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="h-56 rounded-xl border border-border bg-surface-raised lg:col-span-2" />
        <div className="h-56 rounded-xl border border-border bg-surface-raised" />
      </div>
    </div>
  );
}
