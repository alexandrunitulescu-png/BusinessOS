"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold text-text">Ceva n-a mers bine</h1>
      <p className="mt-1.5 text-sm text-text-muted">
        Nu am putut încărca această pagină. Încearcă din nou.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
      >
        Reîncarcă
      </button>
    </div>
  );
}
