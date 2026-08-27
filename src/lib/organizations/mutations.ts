"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "@/lib/organizations/schemas";
import { ACTIVE_ORG_COOKIE } from "@/lib/organizations/constants";
import type { Database } from "@/types/database";

export type OnboardingActionState = {
  error: string | null;
};

export async function createOrganizationAction(
  input: OnboardingInput,
): Promise<OnboardingActionState> {
  const parsed = onboardingSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Date invalide." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // `satisfies` still catches a wrong/missing field here; the `as never` only
  // works around a postgrest-js@2.112.4 generic-inference bug where `.rpc()`
  // resolves `args` to `undefined` for any hand-written (non-codegen) Database
  // type — reproduced in isolation down to a 2-field Args object, independent
  // of @supabase/ssr. Safe to drop once src/types/database.ts is regenerated
  // from the real schema (or the library fixes the inference).
  const rpcArgs = {
    p_entity_type: data.entityType,
    p_legal_name: data.legalName,
    p_trade_name: data.tradeName ?? "",
    p_cui: data.cui,
    p_registration_number: data.registrationNumber ?? "",
    p_address_line: data.addressLine,
    p_city: data.city,
    p_county: data.county,
    p_postal_code: data.postalCode ?? "",
    p_vat_registered: data.vatRegistered,
    p_vat_code: data.vatCode ?? "",
    p_default_currency: data.defaultCurrency,
    p_invoice_series: data.invoiceSeries,
    p_invoice_next_number: data.invoiceNextNumber,
    p_iban: data.iban ?? "",
    p_bank_name: data.bankName ?? "",
  } satisfies Database["public"]["Functions"]["create_organization"]["Args"];

  const { data: organizationId, error } = await supabase.rpc(
    "create_organization",
    rpcArgs as never,
  );

  if (error || !organizationId) {
    return { error: error?.message ?? "Nu am putut crea organizația." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

/** Re-validates membership server-side before trusting the switch — never trusts the client alone. */
export async function switchActiveOrganizationAction(organizationId: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  const { data, error } = await supabase
    .from("organization_users")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error || !data) {
    return { error: "Nu ești membru al acestei organizații." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}
