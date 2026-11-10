"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Heart, ShoppingBag } from "lucide-react";
import { buildConfiguration, getStudioMaterials, makeConfigurationVariantId, studioFinishes } from "@/lib/catalog/configuration";
import type { CatalogProduct } from "@/lib/catalog/types";
import { useCartStore } from "@/state/cart-store";

const WISHLIST_KEY = "vanta:wishlist:v1";
const WISHLIST_EVENT = "vanta:wishlist-changed";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export function WishlistCollection({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState("");
  const [addedSlug, setAddedSlug] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  async function remove(slug: string) {
    setError("");
    const response = await fetch("/api/account/wishlist", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ productSlug: slug }) });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { error?: string };
      setError(result.error ?? "This saved form could not be removed.");
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]") as unknown;
      if (Array.isArray(saved)) localStorage.setItem(WISHLIST_KEY, JSON.stringify(saved.filter((id) => id !== products.find((product) => product.slug === slug)?.id)));
      window.dispatchEvent(new Event(WISHLIST_EVENT));
    } catch { /* The server wishlist is authoritative when browser storage is unavailable. */ }
    setProducts((current) => current.filter((product) => product.slug !== slug));
  }

  function addToBag(product: CatalogProduct) {
    const configuration = buildConfiguration({ source: "product", product, colorIndex: 0, material: getStudioMaterials(product)[0], finish: studioFinishes[0], addOns: [], size: product.category === "footwear" ? "42" : undefined });
    addItem({ productId: product.id, variantId: makeConfigurationVariantId(product.id, configuration), slug: product.slug, name: product.name, unitAmount: configuration.unitPriceCents, currency: product.currency, imageUrl: product.images[0], configuration });
    setAddedSlug(product.slug);
    window.setTimeout(() => setAddedSlug((current) => current === product.slug ? "" : current), 1600);
  }

  return products.length ? <>
    {error ? <p className="account-action-error" role="alert">{error}</p> : null}
    <div className="wishlist-grid">{products.map((product) => <article className="wishlist-card" key={product.id}>
      <Link className="wishlist-card__image" href={`/product/${product.slug}`}>{product.images[0] ? <Image src={product.images[0]} alt={product.imageAlt} fill sizes="(max-width: 650px) 86vw, (max-width: 1050px) 43vw, 28vw" /> : <span>V</span>}<small>{product.categoryName} / Saved form</small></Link>
      <div className="wishlist-card__body"><span>{product.materials.join(" · ")}</span><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link><strong>{money(product.salePriceCents ?? product.priceCents, product.currency)}</strong>
        <div><button className="button button--primary" type="button" onClick={() => addToBag(product)} disabled={product.stockQuantity === 0}>{addedSlug === product.slug ? <><Check size={14} /> Added</> : <>Add to bag <ShoppingBag size={14} /></>}</button><button className="wishlist-card__remove" type="button" aria-label={`Remove ${product.name} from wishlist`} onClick={() => void remove(product.slug)}><Heart size={14} fill="currentColor" /> Remove</button></div>
      </div>
    </article>)}</div>
  </> : <section className="account-orders__empty wishlist-empty"><span><Heart size={18} aria-hidden="true" /></span><p className="eyebrow">A quiet place to begin</p><h3>Keep a form<br /><em>in mind.</em></h3><p>Save products from Discover to compose your own index.</p><Link className="button button--outline" href="/discover">Discover forms <ArrowRight size={14} aria-hidden="true" /></Link></section>;
}
