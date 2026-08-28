"use client";

import { useEffect } from "react";
import { Icon } from "@/components/shell/icons";

export function PrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-hover print:hidden"
    >
      <Icon name="file-text" className="h-4 w-4" />
      Printează / Salvează PDF
    </button>
  );
}
