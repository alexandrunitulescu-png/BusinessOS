/**
 * Transport-agnostic contract for an e-invoicing authority (M0 §10). The
 * Romanian ANAF implementation (`RomanianANAFEInvoiceProvider`) is intentionally
 * NOT built yet — it must be written against the current official ANAF/MF
 * documentation, not from memory. Until then `getEInvoiceProvider()` returns the
 * `notConfiguredProvider`, which lets the whole prepare/validate/preview flow
 * work while every network step fails loudly.
 */

export type EInvoiceRemoteStatus =
  | "QUEUED"
  | "SUBMITTED"
  | "PROCESSING"
  | "VALIDATED"
  | "REJECTED";

export type EInvoiceSubmitResult = { uploadId: string };

export type EInvoiceStatusResult = {
  status: EInvoiceRemoteStatus;
  errorCode?: string;
  errorMessage?: string;
  responseReference?: string;
};

export interface EInvoiceProvider {
  /** Human name, e.g. "ANAF e-Factura (test)". */
  readonly name: string;
  /** Whether this provider can actually talk to the authority right now. */
  readonly isConfigured: boolean;

  authenticate(): Promise<void>;
  submit(xml: string): Promise<EInvoiceSubmitResult>;
  getStatus(uploadId: string): Promise<EInvoiceStatusResult>;
  downloadResponse(uploadId: string): Promise<Uint8Array>;
}

export class EInvoiceNotConfiguredError extends Error {
  constructor() {
    super("Conectarea la ANAF nu este configurată încă.");
    this.name = "EInvoiceNotConfiguredError";
  }
}

export const notConfiguredProvider: EInvoiceProvider = {
  name: "ANAF e-Factura (neconfigurat)",
  isConfigured: false,
  async authenticate() {
    throw new EInvoiceNotConfiguredError();
  },
  async submit() {
    throw new EInvoiceNotConfiguredError();
  },
  async getStatus() {
    throw new EInvoiceNotConfiguredError();
  },
  async downloadResponse() {
    throw new EInvoiceNotConfiguredError();
  },
};
