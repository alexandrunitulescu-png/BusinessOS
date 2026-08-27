import Link from "next/link";

/** Prev/next pager that preserves the current query string. */
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  query,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass =
    "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
  const disabledClass = "rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300";

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-500">
        Pagina {page} din {totalPages} · {total} rezultate
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass}>
            Înapoi
          </Link>
        ) : (
          <span className={disabledClass}>Înapoi</span>
        )}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={linkClass}>
            Înainte
          </Link>
        ) : (
          <span className={disabledClass}>Înainte</span>
        )}
      </div>
    </div>
  );
}
