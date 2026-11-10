import { CatalogSkeleton } from "@/components/catalog/catalog-skeleton";

export default function DiscoverLoading() {
  return (
    <main className="catalog-page catalog-page--loading" aria-busy="true">
      <div className="catalog-loading-hero" />
      <CatalogSkeleton />
    </main>
  );
}
