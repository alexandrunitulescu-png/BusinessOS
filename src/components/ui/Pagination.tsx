import Link from "next/link";

/** Prev/next pager that preserves the given query params across pages. */
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
  params = {},
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  /** Extra query params to keep on the links (e.g. `{ q, status }`). */
  params?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass =
    "rounded-md border border-border-strong bg-surface-raised px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-sunken";
  const disabledClass = "rounded-md border border-border px-3 py-1.5 text-sm text-text-subtle";

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-text-muted">
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
