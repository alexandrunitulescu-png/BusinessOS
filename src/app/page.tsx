import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserMemberships } from "@/lib/organizations/queries";

export default async function RootPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  const memberships = await getUserMemberships(supabase);
  redirect(memberships.length === 0 ? "/onboarding" : "/dashboard");
}
