import { categories, categoryBySlug, collections, demoProducts } from "@/lib/catalog/data";
import { getEditorialCollections } from "@/lib/content/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CatalogCategory,
  CatalogFilters,
  CatalogProduct,
  CatalogResult,
  CatalogSort,
  CategorySlug,
} from "@/lib/catalog/types";

const PAGE_SIZE = 8;

function effectivePrice(product: CatalogProduct) {
  return product.salePriceCents ?? product.priceCents;
}

function availability(product: CatalogProduct) {
  if (product.stockQuantity === 0) return "sold-out";
  if (product.stockQuantity <= 4) return "low-stock";
  return "in-stock";
}

function sortProducts(products: CatalogProduct[], sort: CatalogSort) {
  return [...products].sort((a, b) => {
    switch (sort) {
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      case "price-low":
        return effectivePrice(a) - effectivePrice(b);
      case "price-high":
        return effectivePrice(b) - effectivePrice(a);
      case "best-selling":
        return b.salesCount - a.salesCount;
      default:
        return a.featuredRank - b.featuredRank;
    }
  });
}

function matchesFilters(product: CatalogProduct, filters: CatalogFilters) {
  const searchable = `${product.name} ${product.description} ${product.story} ${product.categoryName} ${product.materials.join(" ")} ${product.colors.map((item) => item.name).join(" ")}`.toLowerCase();
  const price = effectivePrice(product);
  return (
    (!filters.q || searchable.includes(filters.q.trim().toLowerCase())) &&
    (!filters.category || product.category === filters.category) &&
    (filters.minPrice === undefined || price >= filters.minPrice * 100) &&
    (filters.maxPrice === undefined || price <= filters.maxPrice * 100) &&
    (!filters.availability || availability(product) === filters.availability) &&
    (!filters.color || product.colors.some((item) => item.name.toLowerCase() === filters.color?.toLowerCase())) &&
    (!filters.material || product.materials.some((item) => item.toLowerCase() === filters.material?.toLowerCase())) &&
    (!filters.rating || product.averageRating >= filters.rating) &&
    (!filters.collection || product.collectionSlug === filters.collection)
  );
}

function filterDemoProducts(filters: CatalogFilters): CatalogProduct[] {
  const matching = demoProducts.filter((product) => matchesFilters(product, filters));
  return sortProducts(matching, filters.sort ?? "featured");
}

function mapRow(row: Record<string, unknown>): CatalogProduct {
  const category = String(row.category_slug) as CategorySlug;
  const categoryData = categoryBySlug(category);
  const colors = Array.isArray(row.color_swatches)
    ? row.color_swatches.filter((item): item is { name: string; hex: string } =>
        !!item && typeof item === "object" && "name" in item && "hex" in item,
      )
    : [];
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category,
    categoryName: categoryData?.name ?? category,
    description: String(row.description ?? ""),
    story: String(row.story ?? row.description ?? ""),
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    imageAlt: String(row.image_alt ?? row.name),
    materials: Array.isArray(row.materials) ? row.materials.map(String) : [],
    colors,
    priceCents: Number(row.price_cents),
    salePriceCents: row.sale_price_cents === null ? null : Number(row.sale_price_cents),
    currency: "USD",
    stockQuantity: Number(row.stock_quantity ?? 0),
    averageRating: Number(row.average_rating ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    salesCount: Number(row.sales_count ?? 0),
    featuredRank: Number(row.featured_rank ?? 999),
    createdAt: String(row.created_at ?? ""),
    collectionSlug: String(row.collection_slug ?? "edition-001"),
    collectionName: String(row.collection_name ?? "Edition 001 / The first signal"),
    isDemo: Boolean(row.is_demo),
    variants: Array.isArray(row.product_variants) ? row.product_variants.map((variant) => {
      const record = variant as Record<string, unknown>;
      const options = record.options && typeof record.options === "object" && !Array.isArray(record.options)
        ? Object.fromEntries(Object.entries(record.options as Record<string, unknown>).map(([key, value]) => [key, String(value)]))
        : {};
      return {
        id: String(record.id),
        name: String(record.name ?? ""),
        options,
        priceAdjustmentCents: Number(record.price_adjustment_cents ?? 0),
        stockQuantity: Number(record.stock_quantity ?? 0),
        isActive: Boolean(record.is_active),
        sortOrder: Number(record.sort_order ?? 0),
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder) : undefined,
  };
}

export async function getCatalogProducts(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const page = Math.min(50, Math.max(1, filters.page ?? 1));
  const pageSize = Math.min(24, Math.max(1, filters.pageSize ?? PAGE_SIZE));
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const all = filterDemoProducts(filters);
    return {
      products: all.slice(0, page * pageSize),
      count: all.length,
      page,
      pageSize,
      source: "demo",
      error: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("products").select("*,product_variants(id,name,options,price_adjustment_cents,stock_quantity,is_active,sort_order)", { count: "exact" }).eq("is_published", true);
    if (filters.category) query = query.eq("category_slug", filters.category);
    if (filters.q?.trim()) {
      const safeQuery = filters.q.trim().replace(/[<>]/g, " ").slice(0, 80);
      query = query.textSearch("search_document", safeQuery, { type: "websearch", config: "english" });
    }
    if (filters.minPrice !== undefined) query = query.gte("effective_price_cents", filters.minPrice * 100);
    if (filters.maxPrice !== undefined) query = query.lte("effective_price_cents", filters.maxPrice * 100);
    if (filters.availability === "in-stock") query = query.gt("stock_quantity", 4);
    if (filters.availability === "low-stock") query = query.gt("stock_quantity", 0).lte("stock_quantity", 4);
    if (filters.availability === "sold-out") query = query.eq("stock_quantity", 0);
    if (filters.color) query = query.contains("colors", [filters.color]);
    if (filters.material) query = query.contains("materials", [filters.material]);
    if (filters.rating) query = query.gte("average_rating", filters.rating);
    if (filters.collection) query = query.eq("collection_slug", filters.collection);

    const sort = filters.sort ?? "featured";
    const column = sort === "price-low" || sort === "price-high" ? "effective_price_cents"
      : sort === "best-selling" ? "sales_count"
      : sort === "newest" ? "created_at"
      : "featured_rank";
    query = query.order(column, { ascending: sort === "price-low" || sort === "featured" }).order("created_at", { ascending: false });
    const { data, error, count } = await query.range(0, page * pageSize - 1);
    if (error) throw error;
    return {
      products: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
      count: count ?? 0,
      page,
      pageSize,
      source: "supabase",
      error: null,
    };
  } catch (error) {
    console.error("Catalog query failed", error);
    return { products: [], count: 0, page, pageSize, source: "supabase", error: "The catalog could not be loaded. Please try again." };
  }
}

export async function getCatalogCategories(): Promise<{ categories: CatalogCategory[]; source: "supabase" | "demo"; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { categories, source: "demo", error: null };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("categories").select("slug,name,description,intro,hero_image,hero_alt,collection_slugs").order("sort_order");
    if (error) throw error;
    const items = (data ?? []).map((row) => ({
      slug: String(row.slug) as CategorySlug,
      name: String(row.name),
      description: String(row.description),
      intro: String(row.intro),
      heroImage: String(row.hero_image),
      heroAlt: String(row.hero_alt),
      collectionSlugs: Array.isArray(row.collection_slugs) ? row.collection_slugs.map(String) : [],
    }));
    return { categories: items.length ? items : categories, source: "supabase", error: null };
  } catch (error) {
    console.error("Category query failed", error);
    return { categories: [], source: "supabase", error: "Categories could not be loaded. Please try again." };
  }
}

export async function getCatalogProduct(slug: string): Promise<{ product: CatalogProduct | null; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { product: demoProducts.find((item) => item.slug === slug) ?? null, error: null };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("products").select("*,product_variants(id,name,options,price_adjustment_cents,stock_quantity,is_active,sort_order)").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return { product: data ? mapRow(data as Record<string, unknown>) : null, error: null };
  } catch (error) {
    console.error("Product query failed", error);
    return { product: null, error: "This product could not be loaded. Please try again." };
  }
}

export async function getCatalogCollections(query: string) {
  return getEditorialCollections(query);
}

export function getRelatedCollections(slugs: string[]) {
  return collections.filter((collection) => slugs.includes(collection.slug));
}

export function getDemoFilterOptions(products: CatalogProduct[] = demoProducts) {
  return {
    colors: [...new Set(products.flatMap((product) => product.colors.map((item) => item.name)))].sort(),
    materials: [...new Set(products.flatMap((product) => product.materials))].sort(),
  };
}

export async function getCatalogFilterOptions(category?: CategorySlug) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return getDemoFilterOptions(category ? demoProducts.filter((item) => item.category === category) : demoProducts);
  }
  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("products").select("colors,materials").eq("is_published", true);
    if (category) query = query.eq("category_slug", category);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    return {
      colors: [...new Set(rows.flatMap((row) => row.colors ?? []))].sort(),
      materials: [...new Set(rows.flatMap((row) => row.materials ?? []))].sort(),
    };
  } catch (error) {
    console.error("Catalog filter option query failed", error);
    return getDemoFilterOptions(category ? demoProducts.filter((item) => item.category === category) : demoProducts);
  }
}
