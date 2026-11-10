export const categorySlugs = ["objects", "audio", "footwear", "living", "accessories"] as const;

export type CategorySlug = (typeof categorySlugs)[number];
export type AvailabilityFilter = "in-stock" | "low-stock" | "sold-out";
export type CatalogSort = "featured" | "newest" | "price-low" | "price-high" | "best-selling";

export type CatalogCategory = {
  slug: CategorySlug;
  name: string;
  description: string;
  intro: string;
  heroImage: string;
  heroAlt: string;
  collectionSlugs: string[];
};

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  category: CategorySlug;
  categoryName: string;
  description: string;
  story: string;
  images: string[];
  imageAlt: string;
  materials: string[];
  colors: Array<{ name: string; hex: string }>;
  priceCents: number;
  salePriceCents: number | null;
  currency: "USD";
  stockQuantity: number;
  averageRating: number;
  ratingCount: number;
  salesCount: number;
  featuredRank: number;
  createdAt: string;
  collectionSlug: string;
  collectionName: string;
  isDemo: boolean;
  variants?: Array<{
    id: string;
    name: string;
    options: Record<string, string>;
    priceAdjustmentCents: number;
    stockQuantity: number;
    isActive: boolean;
    sortOrder: number;
  }>;
};

export type CatalogFilters = {
  q?: string;
  category?: CategorySlug;
  minPrice?: number;
  maxPrice?: number;
  availability?: AvailabilityFilter;
  color?: string;
  material?: string;
  rating?: number;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  collection?: string;
};

export type CatalogResult = {
  products: CatalogProduct[];
  count: number;
  page: number;
  pageSize: number;
  source: "supabase" | "demo";
  error: string | null;
};

export type CatalogCollection = {
  slug: string;
  name: string;
  description: string;
  image: string;
  categories: CategorySlug[];
};
