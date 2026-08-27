import type { Metadata } from "next";

export const metadata: Metadata = { title: "Document · BusinessPuls" };

/**
 * Bare layout for printable documents — no app shell. The page is styled for
 * A4 and `@media print`; the viewer saves it as PDF from the browser.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">{children}</div>;
}
