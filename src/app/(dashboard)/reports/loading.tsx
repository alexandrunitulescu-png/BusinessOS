export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="h-6 w-40 rounded bg-slate-200" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[6.5rem] rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="mt-5 h-64 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
