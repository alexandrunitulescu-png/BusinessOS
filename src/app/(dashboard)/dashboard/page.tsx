import type { Metadata } from "next";
import { requireActiveMembership } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard · BusinessOS" };

export default async function DashboardPage() {
  const { membership } = await requireActiveMembership();

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">
        Bun venit, {membership.tradeName || membership.legalName}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Autentificare, organizații și izolare pe date sunt gata (M1). Dashboard-ul cu
        KPI-uri reale vine în M2.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Rol curent: <span className="font-medium text-slate-700">{membership.role}</span>
      </p>
    </div>
  );
}
