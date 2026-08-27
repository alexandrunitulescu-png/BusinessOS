// Placeholder shape. `supabase gen types typescript` needs either Docker locally
// (not installed) or a Supabase personal access token to call the Management API
// — neither is set up yet, so this hand-written shape stands in for now. Swap it
// for the generated file once one of those is available:
//   npx supabase gen types typescript --db-url "$SUPABASE_DB_URL" --schema public > src/types/database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export type Database = {
  public: {
    Tables: Record<
      string,
      { Row: AnyRecord; Insert: AnyRecord; Update: AnyRecord; Relationships: unknown[] }
    >;
    Views: Record<string, never>;
    Functions: {
      create_organization: {
        Args: {
          p_entity_type: string;
          p_legal_name: string;
          p_trade_name: string;
          p_cui: string;
          p_registration_number: string;
          p_address_line: string;
          p_city: string;
          p_county: string;
          p_postal_code: string;
          p_vat_registered: boolean;
          p_vat_code: string;
          p_default_currency: string;
          p_invoice_series: string;
          p_invoice_next_number: number;
          p_iban: string;
          p_bank_name: string;
        };
        Returns: string;
      };
      accept_organization_invite: {
        Args: { p_organization_id: string };
        Returns: undefined;
      };
      check_rate_limit: {
        Args: {
          p_bucket: string;
          p_identifier: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: { allowed: boolean; retry_after: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
