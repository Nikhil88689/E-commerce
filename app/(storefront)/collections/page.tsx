import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { CollectionCard } from "@/components/editorial/collection-card";
import { getCatalogProducts } from "@/lib/catalog/service";
import { getEditorialCollections } from "@/lib/content/service";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Collections", description: "Editorial collection studies from VANTA, connecting products through material, movement, sound, and light.", path: "/collections" });
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const { collections, error } = await getEditorialCollections();
  const counts = await Promise.all(collections.map(async (collection) => {
    const result = await getCatalogProducts({ collection: collection.slug, page: 1, pageSize: 1 });
    return [collection.slug, result.count] as const;
  }));
  const productCounts = new Map(counts);

  return <main id="main-content" className="editorial-page collections-index">
    <header className="editorial-index-hero editorial-index-hero--collections"><p className="eyebrow"><span className="signal-dot" /> VANTA / Curated directions</p><h1>Ideas held<br /><em>together.</em></h1><div className="editorial-index-hero__foot"><p>Collections are a way of looking: material, sound, movement, and light, brought into the same frame.</p><a href="#collection-index">Explore the collections <ArrowDown size={14} aria-hidden="true" /></a><span>COLLECTIONS / 0{collections.length.toString().padStart(2, "0")}</span></div></header>
    <section id="collection-index" className="editorial-collection-grid" aria-label="VANTA collections">
      {error ? <div className="editorial-state editorial-state--error"><p className="eyebrow">Collection index / unavailable</p><h2>We could not open<br /><em>the archive.</em></h2><p>{error}</p><Link className="button button--outline" href="/discover">Browse the product archive <ArrowRight size={14} /></Link></div> : collections.length ? collections.map((collection, index) => <CollectionCard key={collection.slug} collection={collection} index={index} productCount={productCounts.get(collection.slug) ?? 0} />) : <div className="editorial-state"><p className="eyebrow">Collection index / in progress</p><h2>The next direction<br /><em>is taking shape.</em></h2><p>Published collection studies will appear here when they are ready.</p></div>}
    </section>
    <section className="editorial-close"><p className="eyebrow">One archive / Many ways in</p><h2>Begin with a <em>form.</em></h2><Link className="button button--primary" href="/discover">Discover all forms <ArrowRight size={14} /></Link></section>
  </main>;
}
