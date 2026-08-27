import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Restricted to background/server jobs: e-Factura status polling, webhook
 * dispatch, usage/billing sync. Never call this from a code path that serves
 * a single user's request on their behalf — use `lib/supabase/server.ts` for
 * that so RLS stays the enforcement boundary. The `server-only` import makes
 * an accidental client-component import a build error rather than a leak.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
