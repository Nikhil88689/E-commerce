"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Heart, Minus, Plus, Tag, Trash2 } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCheckoutQuote } from "@/hooks/use-checkout-quote";
import type { CatalogProduct } from "@/lib/catalog/types";
import { useCartStore } from "@/state/cart-store";

function formatPrice(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export function CartPage({ recommendations }: Readonly<{ recommendations: CatalogProduct[] }>) {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const savedItems = useCartStore((state) => state.savedItems);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const saveForLater = useCartStore((state) => state.saveForLater);
  const moveToBag = useCartStore((state) => state.moveToBag);
  const [discountInput, setDiscountInput] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountNotice, setDiscountNotice] = useState("");
  const { quote, error, loading } = useCheckoutQuote(items, "standard", discountCode);
  const quoteLines = new Map(quote?.items.flatMap((line) => line.cartItemRefs.map((ref) => [ref.variantId, line] as const)) ?? []);

  if (!hydrated) return <main id="main-content" className="cart-page"><div className="cart-page__loading"><span className="studio-loader" /><p>Gathering your bag</p></div></main>;

  function applyDiscount() {
    const code = discountInput.trim().toUpperCase();
    if (!code) {
      setDiscountNotice("Enter a discount code to check it.");
      return;
    }
    setDiscountCode(code);
    setDiscountNotice("Checking this code against the current catalog…");
  }

  return <main id="main-content" className="cart-page">
    <div className="cart-page__top"><Link href="/discover"><ArrowLeft size={14} aria-hidden="true" /> Continue exploring</Link><span>VANTA / YOUR BAG / {String(items.length).padStart(2, "0")} FORMS</span></div>
    <header className="cart-page__heading"><div><p className="eyebrow">Objects chosen / Review your selection</p><h1>Your bag,<br /><em>considered.</em></h1></div><p>Thoughtful forms, held for you. Sample catalog pricing and availability are rechecked before secure test checkout.</p></header>

    {items.length || savedItems.length ? <div className="cart-page__layout" id="cart-items">
      <section className="cart-page__items" aria-label="Shopping bag items">
        <div className="cart-page__items-heading"><span>Selected forms / {items.reduce((sum, item) => sum + item.quantity, 0)} total</span><span>Unit price</span></div>
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const quoteLine = quoteLines.get(item.variantId);
            const displayedUnit = quoteLine?.unitAmountCents ?? item.unitAmount;
            const stock = quoteLine?.stockQuantity ?? 50;
            return <motion.article key={item.variantId} className="cart-line" layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -22, height: 0, marginBottom: 0, paddingBlock: 0 }} transition={{ duration: .28 }}>
              <Link className="cart-line__image" href={`/product/${item.slug}`} aria-label={`View ${item.name}`}>
                {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="(max-width: 700px) 110px, 155px" /> : <span>V</span>}
              </Link>
              <div className="cart-line__details"><p className="eyebrow">Demo catalog / {item.configuration?.source === "studio" ? "Studio build" : "Form study"}</p><Link href={`/product/${item.slug}`}><h2>{item.name}</h2></Link>
                {item.configuration ? <p className="cart-line__configuration">{item.configuration.summary}</p> : <p className="cart-line__configuration">Signature form / Original configuration</p>}
                <p className="cart-line__availability">{stock > 4 ? "Available in demo stock" : stock > 0 ? `Limited / ${stock} in demo stock` : "Unavailable in demo stock"}</p>
                <div className="cart-line__actions"><div className="cart-quantity" aria-label={`Quantity for ${item.name}`}><button type="button" aria-label={`Reduce ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity - 1)} disabled={item.quantity <= 1}><Minus size={12} aria-hidden="true" /></button><motion.output key={item.quantity} initial={{ scale: 1.25, color: "#d8c39f" }} animate={{ scale: 1, color: "#e6e4dc" }} transition={{ duration: .22 }} aria-live="polite">{item.quantity}</motion.output><button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => setQuantity(item.variantId, item.quantity + 1)} disabled={item.quantity >= Math.min(stock, 50)}><Plus size={12} aria-hidden="true" /></button></div>
                  <button className="cart-line__text-action" type="button" onClick={() => saveForLater(item.variantId)}><Heart size={13} aria-hidden="true" /> Save for later</button>
                  <button className="cart-line__text-action cart-line__remove" type="button" onClick={() => removeItem(item.variantId)}><Trash2 size={13} aria-hidden="true" /> Remove</button>
                </div>
              </div>
              <strong className="cart-line__price">{formatPrice(displayedUnit)}</strong>
            </motion.article>;
          })}
        </AnimatePresence>
        {!items.length ? <div className="cart-page__saved-empty"><p className="eyebrow">The active bag is clear</p><h2>Your next form,<br /><em>when you are ready.</em></h2><p>Move a saved selection back to your bag, or continue exploring.</p><Link href="/discover">Continue exploring <ArrowRight size={13} aria-hidden="true" /></Link></div> : null}
        {savedItems.length ? <section className="cart-saved" aria-labelledby="cart-saved-heading"><header><p className="eyebrow">Held for another moment</p><h2 id="cart-saved-heading">Saved for later <span>{savedItems.length}</span></h2></header><div>{savedItems.map((item) => <article className="cart-saved-line" key={item.variantId}><div className="cart-saved-line__image">{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="65px" /> : null}</div><div><Link href={`/product/${item.slug}`}>{item.name}</Link><p>{item.configuration?.summary ?? "Signature form"}</p></div><button type="button" onClick={() => moveToBag(item.variantId)}>Move to bag <ArrowRight size={13} aria-hidden="true" /></button></article>)}</div></section> : null}
      </section>

      {items.length ? <aside className="cart-summary"><p className="eyebrow">Order estimate / 01</p><h2>A clearer<br /><em>total.</em></h2>
        <div className="cart-summary__discount"><label htmlFor="discount-code">Discount code</label><div><Tag size={14} aria-hidden="true" /><input id="discount-code" value={discountInput} onChange={(event) => setDiscountInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyDiscount(); } }} placeholder="Enter code" autoComplete="off"/><button type="button" onClick={applyDiscount} aria-label="Apply discount code"><ArrowRight size={15} aria-hidden="true" /></button></div>{discountNotice ? <p aria-live="polite">{discountNotice}</p> : null}</div>
        {loading ? <p className="cart-summary__updating"><span className="studio-loader" /> Updating server quote</p> : null}
        {error ? <p className="cart-summary__error" role="alert">{error}</p> : null}
        {quote ? <div className="cart-summary__totals"><div><span>Subtotal</span><strong>{formatPrice(quote.subtotalCents)}</strong></div><div><span>Standard delivery / estimate</span><strong>{formatPrice(quote.shippingCents)}</strong></div>{quote.discountCents ? <div className="cart-summary__discount-total"><span>Code {quote.discountCode} <Check size={12} aria-hidden="true" /></span><strong>−{formatPrice(quote.discountCents)}</strong></div> : null}<div className="cart-summary__grand"><span>Estimated total</span><strong>{formatPrice(quote.totalCents)}</strong></div><p>Shipping estimate: {quote.shippingEstimate}. Taxes are not calculated in this test store.</p>{quote.discountError ? <p className="cart-summary__error" role="status">{quote.discountError}</p> : null}</div> : !loading && !error ? <p className="cart-summary__updating">Your server-verified estimate will appear here.</p> : null}
        <Link className={`button button--primary cart-summary__checkout${!quote || loading || error ? " is-disabled" : ""}`} href={!quote || loading || error ? "#cart-items" : quote.discountCode ? `/checkout?discount=${encodeURIComponent(quote.discountCode)}` : "/checkout"} aria-disabled={!quote || loading || !!error} onClick={(event) => { if (!quote || loading || error) event.preventDefault(); }}>Continue to checkout <ArrowRight size={15} aria-hidden="true" /></Link>
        <p className="cart-summary__secure">Stripe test checkout / your payment details stay with Stripe.</p>
        <p className="cart-summary__disclosure">Sample catalog and inventory. Your cart remains saved if a payment is cancelled or fails.</p>
      </aside> : <aside className="cart-summary cart-summary--saved"><p className="eyebrow">The next move / 01</p><h2>Nothing in<br /><em>your bag.</em></h2><p>Saved forms are held on this device. Move one back to continue when you are ready.</p><Link className="button button--outline" href="/discover">Explore the archive <ArrowRight size={14} aria-hidden="true" /></Link></aside>}
    </div> : <div className="cart-page__empty"><span className="cart-page__empty-orbit" aria-hidden="true" /><p className="eyebrow">A clear beginning</p><h2>Your bag is open.</h2><p>Explore the archive and save a form that feels right.</p><Link className="button button--outline" href="/discover">Discover the collection <ArrowRight size={15} aria-hidden="true" /></Link></div>}

    {recommendations.length ? <section className="cart-recommendations" aria-labelledby="cart-recommendations-heading"><header><div><p className="eyebrow">A few forms, in the same spirit</p><h2 id="cart-recommendations-heading">Continue <em>looking.</em></h2></div><Link href="/discover">Discover all <ArrowRight size={13} aria-hidden="true" /></Link></header><div className="catalog-grid">{recommendations.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div></section> : null}
  </main>;
}
