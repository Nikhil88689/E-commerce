"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Clock3, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
import { useCartHydration } from "@/hooks/use-cart-hydration";
import { useCartStore } from "@/state/cart-store";

type ConfirmedOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  shippingMethod: string;
  shippingEstimate: string;
  createdAt: string;
  items: Array<{
    name: string;
    slug: string;
    imageUrl: string | null;
    variantId: string;
    quantity: number;
    unitAmountCents: number;
    currency: string;
    configuration: { summary?: string };
    cartItemRefs: Array<{ variantId: string; quantity: number }>;
  }>;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

async function requestConfirmation(sessionId: string) {
  const response = await fetch(`/api/checkout/confirmation?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  const result = await response.json() as { confirmed?: boolean; paymentStatus?: string; order?: ConfirmedOrder; error?: string };
  if (!response.ok || !result.order) throw new Error(result.error ?? "We could not verify this payment yet.");
  return result;
}

export function ConfirmationClient({ sessionId }: { sessionId: string }) {
  const hydrated = useCartHydration();
  const removePurchasedQuantity = useCartStore((state) => state.removePurchasedQuantity);
  const cleared = useRef(false);
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState(sessionId ? "" : "The confirmation link is missing its secure payment session.");

  const verify = useCallback(() => requestConfirmation(sessionId), [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void verify().then((result) => {
      if (!active) return;
      setOrder(result.order ?? null);
      setConfirmed(result.confirmed === true);
      setPaymentStatus(result.paymentStatus ?? "pending");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "We could not verify this payment yet.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [sessionId, verify]);

  function retryVerification() {
    setLoading(true);
    setError("");
    void verify().then((result) => {
      setOrder(result.order ?? null);
      setConfirmed(result.confirmed === true);
      setPaymentStatus(result.paymentStatus ?? "pending");
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "We could not verify this payment yet.");
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!confirmed || !order || !hydrated || cleared.current) return;
    for (const item of order.items) for (const ref of item.cartItemRefs ?? []) removePurchasedQuantity(ref.variantId, ref.quantity);
    cleared.current = true;
    try { sessionStorage.removeItem("vanta-checkout-discount"); } catch { /* Cart confirmation should not depend on browser storage. */ }
  }, [confirmed, order, hydrated, removePurchasedQuantity]);

  return <main id="main-content" className={`order-confirmation${confirmed ? " is-confirmed" : ""}`}>
    <div className="order-confirmation__top"><Link href="/discover">VANTA</Link><span>ORDER / {confirmed ? "CONFIRMED" : "STATUS"}</span></div>
    {loading ? <div className="order-confirmation__loading"><span className="studio-loader" /><p>Verifying the payment with Stripe</p><small>THE BAG WILL STAY INTACT UNTIL PAYMENT IS CONFIRMED</small></div> : null}
    {!loading && error ? <section className="order-confirmation__pending"><p className="eyebrow">Confirmation / Verification needed</p><h1>Not yet<br /><em>confirmed.</em></h1><p>{error}</p>{sessionId ? <button type="button" className="button button--outline" onClick={retryVerification}><RotateCcw size={14} aria-hidden="true" /> Check payment status</button> : null}<Link href="/cart">Return to your saved bag <ArrowRight size={14} aria-hidden="true" /></Link></section> : null}
    {!loading && !error && order && !confirmed ? <section className="order-confirmation__pending"><span className="order-confirmation__pending-icon"><Clock3 size={22} aria-hidden="true" /></span><p className="eyebrow">Order / {order.orderNumber}</p><h1>Payment in<br /><em>progress.</em></h1><p>Stripe has not confirmed the payment yet. Your bag remains unchanged until the payment status is verified.</p><div className="order-confirmation__pending-status">Payment status / {paymentStatus}</div><button type="button" className="button button--primary" onClick={retryVerification}>Check payment status <RotateCcw size={14} aria-hidden="true" /></button><Link href="/cart">Return to your saved bag <ArrowRight size={14} aria-hidden="true" /></Link></section> : null}
    {!loading && !error && confirmed && order ? <>
      <section className="order-confirmation__hero" aria-labelledby="confirmation-heading">
        <motion.div className="order-confirmation__seal" initial={{ scale: .78, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: .65, ease: [.16, 1, .3, 1] }}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><circle cx="50" cy="50" r="36" /><path d="M32 51l12 12 25-27" /></svg><span><Check size={19} aria-hidden="true" /></span></motion.div>
        <motion.p className="eyebrow" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16 }}>Payment confirmed / Stripe test mode</motion.p>
        <motion.h1 id="confirmation-heading" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .21 }}>A good form,<br /><em>on its way.</em></motion.h1>
        <motion.p className="order-confirmation__thank-you" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .35 }}>Thank you. Your order is recorded in the VANTA test store.</motion.p>
        <div className="order-confirmation__number"><span>ORDER NUMBER</span><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>
      </section>
      <div className="order-confirmation__layout">
        <section className="order-confirmation__items"><header><div><p className="eyebrow">In this order / {order.items.reduce((sum, item) => sum + item.quantity, 0)} forms</p><h2>Chosen <em>well.</em></h2></div><span>{formatPrice(order.totalCents, order.currency)}</span></header>
          {order.items.map((item) => <article key={item.variantId}><div className="order-confirmation__item-image">{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="88px" /> : <span>V</span>}</div><div><Link href={`/product/${item.slug}`}>{item.name}</Link><p>{item.configuration?.summary}</p><small>Quantity {item.quantity}</small></div><strong>{formatPrice(item.unitAmountCents * item.quantity, item.currency)}</strong></article>)}
        </section>
        <aside className="order-confirmation__status"><div><ShieldCheck size={16} aria-hidden="true" /><span><small>PAYMENT</small><strong>Paid / Stripe test mode</strong></span><Check size={14} aria-hidden="true" /></div><div><PackageCheck size={16} aria-hidden="true" /><span><small>DELIVERY ESTIMATE</small><strong>{order.shippingEstimate}</strong></span></div><p>Delivery details and tracking become available when live fulfillment is connected.</p><Link className="button button--primary" href={`/account/orders/${order.id}?session_id=${encodeURIComponent(sessionId)}`}>View your order <ArrowRight size={15} aria-hidden="true" /></Link><Link className="order-confirmation__continue" href="/discover">Continue exploring <ArrowRight size={13} aria-hidden="true" /></Link></aside>
      </div>
      <p className="order-confirmation__demo">This is a test-mode order. No real funds were collected and no shipment will be created.</p>
    </> : null}
  </main>;
}
