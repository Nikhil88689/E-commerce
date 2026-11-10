import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogProducts } from "@/lib/catalog/service";
import { getEditorialCollection, getEditorialCollections } from "@/lib/content/service";
import { pageMetadata } from "@/lib/seo/metadata";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { collection } = await getEditorialCollection(slug);
  return collection ? pageMetadata({ title: collection.name, description: collection.description, path: `/collections/${slug}`, image: collection.imageUrl }) : pageMetadata({ title: "Collection", description: "This VANTA collection could not be found.", path: "/collections", noIndex: true });
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [{ collection, error }, { products, count, error: productError }, { collections }] = await Promise.all([
    getEditorialCollection(slug),
    getCatalogProducts({ collection: slug, page: 1, pageSize: 24 }),
    getEditorialCollections(),
  ]);
  if (!collection && !error) notFound();

  return <main id="main-content" className="editorial-page collection-detail">
    <div className="editorial-breadcrumb"><Link href="/collections"><ArrowLeft size={13} aria-hidden="true" /> ALL COLLECTIONS</Link><span>VANTA / COLLECTION STUDY</span></div>
    {error || !collection ? <section className="editorial-state editorial-state--error"><p className="eyebrow">Collection / unavailable</p><h1>This direction<br /><em>is out of view.</em></h1><p>{error ?? "This collection could not be found."}</p><Link className="button button--outline" href="/collections">Return to collections <ArrowRight size={14} /></Link></section> : <>
      <header className="collection-detail__hero" style={{ "--collection-accent": collection.accentColor } as React.CSSProperties}>
        <Image className="collection-detail__hero-image" src={collection.imageUrl} alt={collection.imageAlt} fill priority sizes="100vw" quality={84} />
        <div className="collection-detail__hero-shade" />
        <div className="collection-detail__hero-copy"><p className="eyebrow">{collection.eyebrow} / VANTA</p><h1>{collection.name}</h1><p>{collection.description}</p><a className="button button--outline" href="#collection-forms">Explore this collection <ArrowRight size={14} aria-hidden="true" /></a></div>
        <span className="collection-detail__hero-index">{String(collection.sortOrder).padStart(2, "0")} / 06</span>
      </header>
      <section className="collection-statement"><p className="eyebrow">A shared direction / The idea</p><blockquote>{collection.statement}</blockquote><p>{collection.description}</p></section>
      <section id="collection-forms" className="collection-products" aria-labelledby="collection-products-heading"><header className="editorial-section-heading"><div><p className="eyebrow">The collection / {count.toString().padStart(2, "0")} forms</p><h2 id="collection-products-heading">Made of one <em>idea.</em></h2></div><span>PRODUCTS / {count.toString().padStart(2, "0")}</span></header>
        {productError ? <div className="editorial-state editorial-state--inline" role="status"><p>{productError}</p><Link href="/discover">Browse the product index <ArrowRight size={14} /></Link></div> : products.length ? <div className="catalog-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="editorial-state editorial-state--inline"><p>No published forms are in this collection yet.</p><Link href="/discover">Explore the full product index <ArrowRight size={14} /></Link></div>}
      </section>
      <section className="collection-worlds"><header><p className="eyebrow">Across the collection / Categories</p><h2>Where the idea<br /><em>takes form.</em></h2></header><div>{collection.categories.map((category) => <Link href={`/discover/${category}`} key={category}><span>VANTA / WORLD</span><strong>{category}</strong><ArrowRight size={15} aria-hidden="true" /></Link>)}</div></section>
      <section className="collection-related"><header><p className="eyebrow">Continue the thought / Collections</p><h2>Another way <em>through.</em></h2></header><div>{collections.filter((item) => item.slug !== collection.slug).slice(0, 3).map((item) => <Link href={`/collections/${item.slug}`} key={item.slug}><span>{item.eyebrow}</span><strong>{item.name}</strong><ArrowRight size={14} aria-hidden="true" /></Link>)}</div></section>
    </>}
  </main>;
}
