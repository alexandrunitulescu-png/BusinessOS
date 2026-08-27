import type { ItemType } from "@/lib/catalog/schemas";

export type Item = {
  id: string;
  type: ItemType;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string;
  price: number;
  currency: string;
  vatRate: number;
  isActive: boolean;
};
