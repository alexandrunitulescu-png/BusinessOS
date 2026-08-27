import type { PaymentStatus } from "@/lib/expenses/schemas";

export type Expense = {
  id: string;
  supplierId: string | null;
  projectId: string | null;
  expenseDate: string;
  category: string | null;
  description: string | null;
  amount: number;
  vatAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
};

export type ExpenseListItem = Expense & { supplierName: string | null };
