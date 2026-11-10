import { isCategorySlug } from "@/lib/catalog/data";
import type { AvailabilityFilter, CatalogFilters, CatalogSort } from "@/lib/catalog/types";

export type SearchParamRecord = Record<string, string | string[] | undefined>;

function read(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(read(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseCatalogFilters(params: SearchParamRecord, forcedCategory?: string): CatalogFilters {
  const rawCategory = forcedCategory ?? read(params.category);
  const availability = read(params.availability);
  const sort = read(params.sort);
  const rating = numberParam(params.rating);
  return {
    q: read(params.q)?.trim() || undefined,
    category: isCategorySlug(rawCategory) ? rawCategory : undefined,
    minPrice: numberParam(params.minPrice),
    maxPrice: numberParam(params.maxPrice),
    availability: availability === "in-stock" || availability === "low-stock" || availability === "sold-out"
      ? availability as AvailabilityFilter
      : undefined,
    color: read(params.color) || undefined,
    material: read(params.material) || undefined,
    rating: rating === 4 || rating === 4.5 ? rating : undefined,
    sort: sort === "newest" || sort === "price-low" || sort === "price-high" || sort === "best-selling"
      ? sort as CatalogSort
      : "featured",
    page: Math.min(50, Math.max(1, Math.floor(numberParam(params.page) ?? 1))),
    collection: read(params.collection) || undefined,
  };
}
