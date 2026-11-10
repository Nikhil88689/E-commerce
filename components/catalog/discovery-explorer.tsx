"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowRight, ChevronDown, Filter, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { CatalogError } from "@/components/catalog/catalog-error";
import { ProductCard } from "@/components/catalog/product-card";
import { categories, collections } from "@/lib/catalog/data";
import type { CatalogCategory, CatalogFilters, CatalogProduct, CatalogResult } from "@/lib/catalog/types";

type DiscoveryExplorerProps = Readonly<{
  result: CatalogResult;
  filters: CatalogFilters;
  category?: CatalogCategory;
  categoryRecords?: CatalogCategory[];
  filterOptions: { colors: string[]; materials: string[] };
}>;

type DraftFilters = {
  category: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
  color: string;
  material: string;
  rating: string;
};

function DebouncedSearchInput({ value, onSearch }: Readonly<{ value: string; onSearch: (value: string) => void }>) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (draft.trim() === value) return;
    const timeout = window.setTimeout(() => onSearch(draft.trim()), 280);
    return () => window.clearTimeout(timeout);
  }, [draft, onSearch, value]);

  return (
    <label className="catalog-inline-search">
      <span className="sr-only">Search the catalog</span>
      <input type="search" placeholder="Search the index" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <span aria-hidden="true">⌕</span>
    </label>
  );
}

function toDraft(filters: CatalogFilters): DraftFilters {
  return {
    category: filters.category ?? "",
    minPrice: filters.minPrice?.toString() ?? "",
    maxPrice: filters.maxPrice?.toString() ?? "",
    availability: filters.availability ?? "",
    color: filters.color ?? "",
    material: filters.material ?? "",
    rating: filters.rating?.toString() ?? "",
  };
}

const fieldCopy: Array<{ key: keyof DraftFilters; label: string; options?: string[]; values?: Array<{ value: string; label: string }> }> = [
  { key: "availability", label: "Availability", values: [{ value: "", label: "Any availability" }, { value: "in-stock", label: "In stock" }, { value: "low-stock", label: "Limited stock" }, { value: "sold-out", label: "Unavailable" }] },
  { key: "color", label: "Color" },
  { key: "material", label: "Material" },
  { key: "rating", label: "Rating", values: [{ value: "", label: "Any rating" }, { value: "4", label: "4+ stars" }, { value: "4.5", label: "4.5+ stars" }] },
];

function FilterFields({
  draft,
  onChange,
  filterOptions,
  categoryRecords,
  showCategory,
}: Readonly<{
  draft: DraftFilters;
  onChange: (key: keyof DraftFilters, value: string) => void;
  filterOptions: DiscoveryExplorerProps["filterOptions"];
  categoryRecords: CatalogCategory[];
  showCategory: boolean;
}>) {
  return (
    <div className="filter-fields">
      {showCategory ? (
        <label className="filter-field"><span>World</span>
          <select value={draft.category} onChange={(event) => onChange("category", event.target.value)}>
            <option value="">All worlds</option>
            {categoryRecords.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
      ) : null}
      <fieldset className="filter-fieldset">
        <legend>Price / USD</legend>
        <div className="filter-price-range">
          <label><span className="sr-only">Minimum price in dollars</span><span aria-hidden="true">$</span><input type="number" min="0" inputMode="numeric" placeholder="From" value={draft.minPrice} onChange={(event) => onChange("minPrice", event.target.value)} /></label>
          <span aria-hidden="true">—</span>
          <label><span className="sr-only">Maximum price in dollars</span><span aria-hidden="true">$</span><input type="number" min="0" inputMode="numeric" placeholder="To" value={draft.maxPrice} onChange={(event) => onChange("maxPrice", event.target.value)} /></label>
        </div>
      </fieldset>
      {fieldCopy.map((field) => {
        const values = field.values ?? (field.key === "color"
          ? [{ value: "", label: "Any color" }, ...filterOptions.colors.map((value) => ({ value, label: value }))]
          : [{ value: "", label: "Any material" }, ...filterOptions.materials.map((value) => ({ value, label: value }))]);
        return (
          <label className="filter-field" key={field.key}><span>{field.label}</span>
            <select value={draft[field.key]} onChange={(event) => onChange(field.key, event.target.value)}>
              {values.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function CollectionCard({ collection }: Readonly<{ collection: (typeof collections)[number] }>) {
  return (
    <Link className="catalog-collection-card" href={`/collections/${collection.slug}`}>
      <div className="catalog-collection-card__image"><Image src={collection.image} alt="" fill sizes="(max-width: 640px) 75vw, 28vw" /></div>
      <span className="eyebrow">Collection study / {collection.categories.length.toString().padStart(2, "0")}</span>
      <strong>{collection.name}</strong>
      <span>{collection.description}</span>
      <ArrowRight aria-hidden="true" size={15} />
    </Link>
  );
}

export function DiscoveryExplorer({ result, filters, category, categoryRecords = categories, filterOptions }: DiscoveryExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(filters));
  const [filterMessage, setFilterMessage] = useState("");
  const [isPending, startRouteTransition] = useTransition();

  const navigateParams = useCallback((changes: Record<string, string>, method: "push" | "replace" = "push") => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    if (!("page" in changes)) params.delete("page");
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startRouteTransition(() => {
      router[method](href, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  const updateSearch = useCallback((value: string) => navigateParams({ q: value }, "replace"), [navigateParams]);

  const activeFilterCount = useMemo(() => [filters.category && !category, filters.minPrice !== undefined, filters.maxPrice !== undefined, filters.availability, filters.color, filters.material, filters.rating, filters.collection].filter(Boolean).length, [filters, category]);
  const draftChange = (key: keyof DraftFilters, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const applyFilters = () => {
    const min = draft.minPrice ? Number(draft.minPrice) : undefined;
    const max = draft.maxPrice ? Number(draft.maxPrice) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setFilterMessage("The minimum price must be lower than the maximum.");
      return;
    }
    setFilterMessage("");
    navigateParams({
      category: category ? "" : draft.category,
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
      availability: draft.availability,
      color: draft.color,
      material: draft.material,
      rating: draft.rating,
    });
    setFilterOpen(false);
  };
  const clearFilters = () => {
    setDraft({ category: "", minPrice: "", maxPrice: "", availability: "", color: "", material: "", rating: "" });
    setFilterMessage("");
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (category) {
      router.push(`/discover/${category.slug}${params.size ? `?${params}` : ""}`, { scroll: false });
    } else {
      router.push(`/discover${params.size ? `?${params}` : ""}`, { scroll: false });
    }
  };

  const resultHeading = category ? `The ${category.name.toLowerCase()} index` : "Selected forms";
  const relatedCollections = category ? collections.filter((item) => category.collectionSlugs.includes(item.slug)) : collections.slice(0, 3);
  const shown = Math.min(result.products.length, result.count);
  const productGrid = result.error ? null : result.products.length ? (
    <motion.div layout className="catalog-grid" aria-busy={isPending}>
      <AnimatePresence mode="popLayout">
        {result.products.map((product: CatalogProduct, index) => <ProductCard key={product.id} product={product} index={index} />)}
      </AnimatePresence>
    </motion.div>
  ) : (
    <div className="catalog-state catalog-state--empty" role="status">
      <p className="eyebrow">No matching forms</p>
      <h2>Try another direction.</h2>
      <p>We couldn’t find a demo product with that combination of filters.</p>
      <button className="text-button" type="button" onClick={clearFilters}>Clear filters <ArrowRight aria-hidden="true" size={14} /></button>
    </div>
  );

  return (
    <main id="main-content" className="catalog-page">
      <section className={`catalog-hero${category ? " catalog-hero--category" : " catalog-hero--discover"}`}>
        <div className="catalog-hero__image"><Image src={category?.heroImage ?? "/images/products/orbit-table.webp"} alt={category?.heroAlt ?? "A sculptural side table in a VANTA interior study"} fill priority sizes="(max-width: 800px) 100vw, 55vw" quality={86} /></div>
        <div className="catalog-hero__shade" aria-hidden="true" />
        <div className="catalog-hero__copy">
          <p className="eyebrow"><span className="signal-dot" /> VANTA / {category ? category.name : "Product index"} / Demo catalog</p>
          <h1>{category ? <>A world of <em>{category.name.toLowerCase()}.</em></> : <>A world in <em>form.</em></>}</h1>
          <p>{category?.intro ?? "Objects for living, listening, moving, and noticing. A considered product index, still taking shape."}</p>
          <div className="catalog-hero__meta">
            <span>{result.count.toString().padStart(2, "0")} sample {result.count === 1 ? "piece" : "pieces"}</span>
            <span>Prices and stock are demo values</span>
          </div>
        </div>
        <span className="catalog-hero__index" aria-hidden="true">DISCOVER / 001</span>
      </section>

      {!category ? (
        <section className="catalog-featured" aria-label="Featured collection">
          <div className="catalog-featured__copy">
            <p className="eyebrow">Featured collection / Edition 001</p>
            <h2>The first <em>signal.</em></h2>
            <p>A study across material, movement, sound, and the spaces that hold them.</p>
            <Link className="text-button" href="/discover?collection=edition-001">Explore the collection <ArrowRight aria-hidden="true" size={14} /></Link>
          </div>
          <div className="catalog-featured__visual">
            <Image src="/images/products/bookends.webp" alt="Sculptural champagne aluminum forms on a limestone plinth" fill sizes="(max-width: 800px) 100vw, 45vw" quality={84} />
            <span>FORM STUDY / 01—05</span>
          </div>
        </section>
      ) : null}

      <nav className="catalog-world-nav" aria-label="Product categories">
        <Link href="/discover" aria-current={!category ? "page" : undefined}>All directions</Link>
        {categoryRecords.map((item, index) => <Link key={item.slug} href={`/discover/${item.slug}`} aria-current={category?.slug === item.slug ? "page" : undefined}><span>0{index + 1}</span>{item.name}</Link>)}
      </nav>

      <section className="catalog-results" aria-labelledby="catalog-heading">
        <header className="catalog-results__heading">
          <div>
            <p className="eyebrow">VANTA index / {String(result.count).padStart(2, "0")}</p>
            <h2 id="catalog-heading">{resultHeading}<span>.</span></h2>
          </div>
          <div className="catalog-results__tools">
            <DebouncedSearchInput key={queryFromUrl} value={queryFromUrl} onSearch={updateSearch} />
            <button className="catalog-filter-toggle" type="button" onClick={() => { setDraft(toDraft(filters)); setFilterOpen(true); }} aria-haspopup="dialog"><SlidersHorizontal aria-hidden="true" size={15} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
            <label className="catalog-sort"><span className="sr-only">Sort products</span><select value={filters.sort ?? "featured"} onChange={(event) => navigateParams({ sort: event.target.value })}><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="best-selling">Best selling</option></select><ChevronDown aria-hidden="true" size={13} /></label>
          </div>
        </header>

        <div className="catalog-toolbar-status" aria-live="polite">
          <span>{isPending ? "Updating the index…" : `Showing ${shown} of ${result.count} sample ${result.count === 1 ? "piece" : "pieces"}`}</span>
          {activeFilterCount ? <button type="button" onClick={clearFilters}>Clear all filters <X aria-hidden="true" size={12} /></button> : <span>{result.count} sample designs / USD</span>}
        </div>

        {result.error ? <CatalogError message={result.error} /> : productGrid}

        {!result.error && result.products.length < result.count ? (
          <div className="catalog-load-more"><button className="button button--outline" type="button" onClick={() => navigateParams({ page: String((filters.page ?? 1) + 1) })}>Load more <ArrowDown aria-hidden="true" size={15} /></button><span>{result.count - result.products.length} more to explore</span></div>
        ) : null}
      </section>

      <section className="catalog-related" aria-labelledby="related-collections-heading">
        <header><p className="eyebrow">Shared directions / Collections</p><h2 id="related-collections-heading">Ideas travel <em>together.</em></h2></header>
        <div className="catalog-collection-grid">{relatedCollections.map((item) => <CollectionCard key={item.slug} collection={item} />)}</div>
      </section>

      <aside className="catalog-demo-note"><span className="signal-dot" /><p>This is a demonstration catalog. Prices, ratings, and inventory are sample data and do not represent a live offer.</p></aside>

      <Modal open={filterOpen} onOpenChange={setFilterOpen} title="Refine the index" variant="drawer" className="catalog-filter-dialog">
        <div className="catalog-filter-drawer">
          <p className="eyebrow">Filter selection / {activeFilterCount.toString().padStart(2, "0")}</p>
          <FilterFields draft={draft} onChange={draftChange} filterOptions={filterOptions} categoryRecords={categoryRecords} showCategory={!category} />
          {filterMessage ? <p className="catalog-filter-error" role="alert">{filterMessage}</p> : null}
          <div className="catalog-filter-drawer__actions"><button className="button button--outline" type="button" onClick={clearFilters}>Reset</button><button className="button button--primary" type="button" onClick={applyFilters}>Apply filters <Filter aria-hidden="true" size={14} /></button></div>
        </div>
      </Modal>

    </main>
  );
}
