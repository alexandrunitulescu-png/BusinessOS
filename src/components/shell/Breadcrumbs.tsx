"use client";

import Link from "next/link";
import { HREF_LABELS } from "@/lib/navigation";

/**
 * Derives a breadcrumb trail from the current pathname using the nav label map.
 * Kept intentionally shallow — the app is two levels deep for now
 * (section → detail), and detail pages pass their own trailing crumb later.
 */
export function Breadcrumbs({
  pathname,
  className = "",
}: {
  pathname: string;
  className?: string;
}) {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((_, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const known = HREF_LABELS[href];
    return {
      href,
      label: known ?? decodeURIComponent(segments[index]).replace(/-/g, " "),
      // Only slug-derived labels get title-cased; curated labels stay as written.
      capitalize: !known,
    };
  });

  if (crumbs.length === 0) return <div className={className} />;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <span className="text-slate-300">/</span>}
              {isLast ? (
                <span
                  className={`truncate font-medium text-slate-900 ${
                    crumb.capitalize ? "capitalize" : ""
                  }`}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={`truncate text-slate-500 hover:text-slate-900 ${
                    crumb.capitalize ? "capitalize" : ""
                  }`}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
