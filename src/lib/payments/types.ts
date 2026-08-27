import type { PaymentMethod } from "@/lib/payments/schemas";

export type Payment = {
  id: string;
  invoiceId: string | null;
  expenseId: string | null;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
};

export type PaymentListItem = Payment & {
  /** "INVOICE" | "EXPENSE" */
  direction: "IN" | "OUT";
  targetLabel: string;
  targetHref: string;
};
