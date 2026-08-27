import { requireActiveMembership } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { prepareEInvoice } from "@/lib/efactura/prepare";
import { invoiceNumberLabel } from "@/lib/invoicing/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, membership } = await requireActiveMembership();
  if (!hasPermission(membership.role, "money", "read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const prepared = await prepareEInvoice(supabase, membership.id, id);
  if (!prepared.ok) {
    return new Response(prepared.error, { status: 404 });
  }

  const filename = `${invoiceNumberLabel(prepared.invoice)}-efactura.xml`.replace(/\s+/g, "_");

  return new Response(prepared.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
