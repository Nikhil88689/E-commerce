"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, PackageCheck, ShieldAlert, Trash2 } from "lucide-react";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCartStore } from "@/state/cart-store";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export function CheckoutPreview() {
  const hydrated = useCartHydration();
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = items.reduce((total, item) => total + item.unitAmount * item.quantity, 0);
  const currency = items[0]?.currency ?? "USD";

  if (!hydrated) return <main id="main-content" className="checkout-preview"><div className="checkout-preview__loading"><span className="studio-loader" /><p>Opening the bag preview</p></div></main>;

  return <main id="main-content" className="checkout-preview">
    <div className="checkout-preview__top"><Link href="/discover"><ArrowLeft size={14} aria-hidden="true" /> Continue exploring</Link><span>VANTA / CHECKOUT PREVIEW</span></div>
    <header className="checkout-preview__heading"><p className="eyebrow">Order preview / No payment</p><h1>Your bag,<br /><em>in review.</em></h1><p>This demo lets you review sample items and configuration choices. It does not submit an order or collect payment details.</p></header>
    <div className="checkout-preview__notice"><ShieldAlert size={17} aria-hidden="true" /><span><strong>Preview only.</strong> VANTA checkout and payment processing are not connected. Prices and stock are sample catalog data.</span></div>
    {items.length ? <div className="checkout-preview__layout">
      <section className="checkout-preview__lines" aria-label="Bag items">
        {items.map((item) => <article className="checkout-line" key={item.variantId}>
          <Link className="checkout-line__image" href={`/product/${item.slug}`} aria-label={`View ${item.name}`}>
            {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="(max-width: 700px) 120px, 160px" /> : <span>V</span>}
          </Link>
          <div className="checkout-line__details"><p className="eyebrow">Demo item / {item.configuration?.source === "studio" ? "Studio build" : "Catalog form"}</p><Link href={`/product/${item.slug}`}><h2>{item.name}</h2></Link>
            {item.configuration ? <p className="checkout-line__configuration">{item.configuration.summary}</p> : null}
            <div className="checkout-line__quantity"><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => setQuantity(item.variantId, item.quantity - 1)}><Minus size={13} aria-hidden="true" /></button><span>Qty {item.quantity}</span><button type="button" aria-label={`Remove ${item.name} from bag`} onClick={() => removeItem(item.variantId)}><Trash2 size={13} aria-hidden="true" /></button></div>
          </div>
          <strong className="checkout-line__price">{formatPrice(item.unitAmount * item.quantity, item.currency)}</strong>
        </article>)}
      </section>
      <aside className="checkout-preview__summary"><p className="eyebrow">Preview summary</p><div><span>Sample subtotal</span><strong>{formatPrice(subtotal, currency)}</strong></div><div><span>Shipping</span><span>Not calculated</span></div><div><span>Taxes</span><span>Not calculated</span></div><div className="checkout-preview__total"><span>Sample total</span><strong>{formatPrice(subtotal, currency)}</strong></div><button type="button" disabled className="button button--primary checkout-preview__pay">Payment unavailable <ArrowRight size={14} aria-hidden="true" /></button><p>Order placement activates when live commerce is connected.</p><span className="checkout-preview__fulfillment"><PackageCheck size={14} aria-hidden="true" /> Delivery terms to be announced</span></aside>
    </div> : <div className="checkout-preview__empty"><span className="eyebrow">Nothing in the preview bag</span><h2>A clear beginning.</h2><p>Explore a form and add a sample configuration to see it here.</p><Link className="button button--outline" href="/discover">Browse the catalog <ArrowRight size={14} aria-hidden="true" /></Link></div>}
  </main>;
}
