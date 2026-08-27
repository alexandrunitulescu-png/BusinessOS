import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInvoiceWithLines } from "@/lib/invoicing/queries";
import { getClient } from "@/lib/crm/queries";
import { getOrganizationBillingInfo } from "@/lib/organizations/queries";
import { getCountryModule } from "@/lib/country";
import { mapInvoiceToNeutral } from "@/lib/efactura/mapper";
import { validateNeutralEInvoice, type ValidationResult } from "@/lib/efactura/validator";
import { toUBL } from "@/lib/efactura/ubl";
import type { NeutralEInvoice } from "@/lib/efactura/model";
import type { InvoiceWithLines } from "@/lib/invoicing/types";
import type { EInvoiceProvider } from "@/lib/efactura/provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

export type PreparedEInvoice =
  | { ok: false; error: string }
  | {
      ok: true;
      invoice: InvoiceWithLines;
      model: NeutralEInvoice;
      validation: ValidationResult;
      xml: string;
      provider: EInvoiceProvider | null;
      countryCode: string;
    };

/**
 * Runs the full country-neutral pipeline for one invoice:
 * Invoice -> neutral model -> validation -> UBL XML. No network — the provider
 * is resolved but not called here.
 */
export async function prepareEInvoice(
  supabase: Db,
  organizationId: string,
  invoiceId: string,
): Promise<PreparedEInvoice> {
  const invoice = await getInvoiceWithLines(supabase, organizationId, invoiceId);
  if (!invoice) return { ok: false, error: "Factura nu există." };
  if (invoice.status === "DRAFT") {
    return { ok: false, error: "Emite factura înainte de a pregăti e-Factura." };
  }

  const [client, org] = await Promise.all([
    getClient(supabase, organizationId, invoice.clientId),
    getOrganizationBillingInfo(supabase, organizationId),
  ]);
  if (!org) return { ok: false, error: "Lipsesc datele companiei." };

  const countryModule = getCountryModule(org.country);
  if (!countryModule) {
    return { ok: false, error: `Țara „${org.country}” nu are un modul fiscal.` };
  }

  const model = mapInvoiceToNeutral(invoice, client, org);
  const validation = validateNeutralEInvoice(model, countryModule);
  const xml = toUBL(model);

  return {
    ok: true,
    invoice,
    model,
    validation,
    xml,
    provider: countryModule.getEInvoiceProvider(),
    countryCode: countryModule.code,
  };
}
