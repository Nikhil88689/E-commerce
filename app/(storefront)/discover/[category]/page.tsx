import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";
import { DiscoveryExplorer } from "@/components/catalog/discovery-explorer";
import { categories, categoryBySlug } from "@/lib/catalog/data";
import { parseCatalogFilters, type SearchParamRecord } from "@/lib/catalog/params";
import { getCatalogCategories, getCatalogFilterOptions, getCatalogProducts } from "@/lib/catalog/service";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return categories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ category: string }> }>): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) return pageMetadata({ title: "World not found", description: "This VANTA product world could not be found.", path: "/discover", noIndex: true });
  return pageMetadata({ title: `${category.name} / Discover`, description: category.description, path: `/discover/${slug}` });
}

export default async function CategoryDiscoverPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ category: string }>; searchParams: Promise<SearchParamRecord> }>) {
  const [{ category: slug }, query] = await Promise.all([params, searchParams]);
  const fallback = categoryBySlug(slug);
  if (!fallback) notFound();

  const [categoryResult, result, filterOptions] = await Promise.all([
    getCatalogCategories(),
    getCatalogProducts(parseCatalogFilters(query, slug)),
    getCatalogFilterOptions(slug as (typeof categories)[number]["slug"]),
  ]);
  const category = categoryResult.categories.find((item) => item.slug === slug) ?? fallback;
  const catalogResult = categoryResult.error ? { ...result, error: categoryResult.error } : result;
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <DiscoveryExplorer result={catalogResult} filters={parseCatalogFilters(query, slug)} category={category} categoryRecords={categoryResult.categories} filterOptions={filterOptions} />
    </Suspense>
  );
}
