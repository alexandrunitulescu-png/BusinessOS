import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getUserMemberships } from "@/lib/organizations/queries";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const metadata: Metadata = { title: "Configurare · BusinessPuls" };

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  const memberships = await getUserMemberships(supabase);

  if (memberships.length > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4 py-12">
      <OnboardingWizard />
    </div>
  );
}
