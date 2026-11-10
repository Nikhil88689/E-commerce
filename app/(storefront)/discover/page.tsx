import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { DiscoveryExplorer } from "@/components/catalog/discovery-explorer";
import { getCatalogCategories, getCatalogFilterOptions, getCatalogProducts } from "@/lib/catalog/service";
import { parseCatalogFilters, type SearchParamRecord } from "@/lib/catalog/params";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Discover / Product index",
  description: "Explore VANTA sample products across objects, audio, footwear, living, and accessories.",
  path: "/discover",
});

export default async function DiscoverPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParamRecord> }>) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const [result, categoryResult, filterOptions] = await Promise.all([getCatalogProducts(filters), getCatalogCategories(), getCatalogFilterOptions()]);
  const catalogResult = categoryResult.error ? { ...result, error: categoryResult.error } : result;
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <DiscoveryExplorer result={catalogResult} filters={filters} categoryRecords={categoryResult.categories} filterOptions={filterOptions} />
    </Suspense>
  );
}
