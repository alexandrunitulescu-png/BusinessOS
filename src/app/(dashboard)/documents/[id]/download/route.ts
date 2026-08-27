import { redirect } from "next/navigation";
import { requireActiveMembership } from "@/lib/auth/session";
import { getDocument, createDocumentSignedUrl } from "@/lib/documents/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, membership } = await requireActiveMembership();
  const { id } = await params;

  const doc = await getDocument(supabase, membership.id, id);
  if (!doc) return new Response("Not found", { status: 404 });

  const signedUrl = await createDocumentSignedUrl(supabase, doc.storagePath, 300);
  if (!signedUrl) return new Response("Nu am putut genera linkul.", { status: 500 });

  redirect(signedUrl);
}
