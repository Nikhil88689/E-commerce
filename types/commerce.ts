export type ProductVariant = {
  id: string;
  sku: string;
  label: string;
  unitAmount: number;
  currency: string;
  availableQuantity: number;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: string[];
  variants: ProductVariant[];
};
