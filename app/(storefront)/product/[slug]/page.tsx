import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CircleHelp, PackageCheck, RotateCcw, Sparkles, Star } from "lucide-react";
import { ProductDetailControls } from "@/components/catalog/product-detail-controls";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductCard } from "@/components/catalog/product-card";
import { getCatalogProduct, getCatalogProducts } from "@/lib/catalog/service";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getCatalogProduct(slug);
  return product
    ? pageMetadata({ title: product.name, description: product.description, path: `/product/${slug}`, image: product.images[0] })
    : pageMetadata({ title: "Form not found", description: "This VANTA product could not be found.", path: "/discover", noIndex: true });
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price / 100);
}

export default async function ProductDetailPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const { product, error } = await getCatalogProduct(slug);
  if (!product && !error) notFound();
  if (!product) {
    return <main id="main-content" className="product-error"><p className="eyebrow">Product / Connection interrupted</p><h1>This form is temporarily unavailable.</h1><p>{error}</p><Link className="button button--outline" href="/discover">Return to the index</Link></main>;
  }

  const currentPrice = product.salePriceCents ?? product.priceCents;
  const availability = product.stockQuantity === 0 ? "Unavailable in demo stock" : product.stockQuantity <= 4 ? `Limited / ${product.stockQuantity} left in demo stock` : "Available / demo inventory";
  const relatedResult = await getCatalogProducts({ category: product.category, sort: "featured", pageSize: 8 });
  const related = relatedResult.products.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <main id="main-content" className="product-detail">
      <div className="product-detail__topline">
        <Link href={`/discover/${product.category}`}><ArrowLeft aria-hidden="true" size={14} /> Back to {product.categoryName}</Link>
        <span>VANTA / DEMO CATALOG / {product.category.toUpperCase()}</span>
      </div>
      <div className="product-detail__layout">
        <ProductGallery product={product} />
        <section className="product-detail__info" aria-labelledby="product-title">
          <p className="eyebrow">{product.categoryName} / Form study · Demo item</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="product-detail__rating"><Star aria-hidden="true" size={13} fill="currentColor" /> {product.averageRating.toFixed(1)} <span>({product.ratingCount} sample ratings)</span></p>
          <p className="product-detail__description">{product.description}</p>
          <p className="product-detail__price product-detail__price--static">{product.salePriceCents !== null ? <><span>{formatPrice(currentPrice, product.currency)}</span><del>{formatPrice(product.priceCents, product.currency)}</del></> : formatPrice(product.priceCents, product.currency)}<small>Sample price</small></p>
          <p className={`product-detail__stock${product.stockQuantity === 0 ? " is-unavailable" : ""}`}><span />{availability}</p>
          <ProductDetailControls product={product} />
          <Link className="product-detail__studio-link" href={`/product/${product.slug}/studio`}><span className="product-detail__studio-mark"><Sparkles size={16} aria-hidden="true" /></span><span><small>VANTA / OBJECT STUDIO</small>Customize this form</span><ArrowUpRight aria-hidden="true" size={16} /></Link>
          <p className="product-detail__demo-note">This is a sample catalog. Secure Stripe test checkout starts when server credentials are configured.</p>
          <div className="product-detail__delivery"><p className="eyebrow">A considered arrival</p><p>Delivery estimates and return terms will be confirmed when this collection launches.</p><div><span><PackageCheck size={14} aria-hidden="true" /> Shipping details at launch</span><span><RotateCcw size={14} aria-hidden="true" /> Returns policy at launch</span></div></div>
        </section>
      </div>

      <section className="product-editorial" aria-labelledby="product-story-heading">
        <div className="product-editorial__lead"><p className="eyebrow">The thought behind the form / 0{product.featuredRank}</p><h2 id="product-story-heading">Made to be<br /><em>lived with.</em></h2></div>
        <div className="product-editorial__body"><p>{product.story}</p><span>VANTA / {product.collectionName.toUpperCase()}</span></div>
      </section>

      <section className="product-specifications" aria-labelledby="product-spec-heading">
        <header><div><p className="eyebrow">Object record / Material notes</p><h2 id="product-spec-heading">The details,<br /><em>considered.</em></h2></div><p>Material and configuration information for the VANTA form study. Live manufacturing specifications will be confirmed at launch.</p></header>
        <div className="product-specifications__grid">
          <div className="product-specifications__materials"><span className="eyebrow">Materials / 0{product.materials.length}</span>{product.materials.map((material, index) => <div key={material}><span>0{index + 1}</span><strong>{material}</strong><Check size={13} aria-hidden="true" /></div>)}</div>
          <dl className="product-specifications__table">
            <div><dt>Category</dt><dd>{product.categoryName}</dd></div>
            <div><dt>Collection</dt><dd>{product.collectionName}</dd></div>
            <div><dt>Colorways</dt><dd>{product.colors.map((item) => item.name).join(" / ")}</dd></div>
            <div><dt>Availability</dt><dd>{availability}</dd></div>
            <div><dt>Price basis</dt><dd>{formatPrice(currentPrice, product.currency)} / sample catalog</dd></div>
          </dl>
        </div>
      </section>

      <section className="product-aftercare" aria-label="Shipping and returns information">
        <div><PackageCheck size={18} aria-hidden="true" /><div><h3>Shipping</h3><p>Delivery windows are not published for concept catalog items. Final details will be available at launch.</p></div><CircleHelp size={14} aria-hidden="true" /></div>
        <div><RotateCcw size={18} aria-hidden="true" /><div><h3>Returns</h3><p>Returns and exchanges are not active in this preview. The policy will be published before launch.</p></div><CircleHelp size={14} aria-hidden="true" /></div>
      </section>

      <section className="product-reviews" aria-labelledby="product-reviews-heading">
        <div className="product-reviews__score"><p className="eyebrow">Customer notes / Sample data</p><strong>{product.averageRating.toFixed(1)}<Star size={20} fill="currentColor" aria-hidden="true" /></strong><span>Based on {product.ratingCount} sample ratings</span></div>
        <div className="product-reviews__copy"><h2 id="product-reviews-heading">A record of<br /><em>good things.</em></h2><p>Customer reviews are not connected in this preview. The rating shown here is catalog demo data and does not represent verified customer feedback.</p></div>
        <span className="product-reviews__stamp">NOT<br />LIVE</span>
      </section>

      {related.length ? <section className="product-related" aria-labelledby="product-related-heading"><header><div><p className="eyebrow">Continue in {product.categoryName}</p><h2 id="product-related-heading">Related <em>forms.</em></h2></div><Link href={`/discover/${product.category}`}>Explore all <ArrowRight size={14} aria-hidden="true" /></Link></header><div className="catalog-grid product-related__grid">{related.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section> : null}
      <div className="product-detail__endnote"><span>VANTA / OBJECT ARCHIVE</span><Link href="/discover">Return to Discover <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    </main>
  );
}
