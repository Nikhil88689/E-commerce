"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  payment: { provider: string; status: string; amountCents: number; currency: string; createdAt: string; reference: string | null } | null;
  totalCents: number;
  currency: string;
  shippingMethod: string;
  shippingEstimate: string;
  shippingAddress: { recipient?: string; line1?: string; line2?: string; city?: string; region?: string; postalCode?: string; countryCode?: string };
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  paidAt: string | null;
  items: Array<{ name: string; slug: string; imageUrl: string | null; variantId: string; quantity: number; unitAmountCents: number; currency: string; configuration: { summary?: string } }>;
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

async function requestOrderDetails(orderId: string, sessionId: string) {
  const search = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
  const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}${search}`, { cache: "no-store" });
  const result = await response.json() as { order?: OrderDetail; error?: string };
  if (!response.ok || !result.order) throw new Error(result.error ?? "Order details could not be verified.");
  return result.order;
}

export function OrderDetailClient({ orderId, sessionId }: { orderId: string; sessionId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void requestOrderDetails(orderId, sessionId).then((value) => {
      if (active) setOrder(value);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Order details could not be verified.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId, sessionId]);

  function loadOrder() {
    setLoading(true);
    setError("");
    void requestOrderDetails(orderId, sessionId).then(setOrder).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Order details could not be verified.");
    }).finally(() => setLoading(false));
  }

  return <main id="main-content" className="order-detail">
    <div className="order-detail__top"><Link href="/discover"><ArrowLeft size={14} aria-hidden="true" /> VANTA / CONTINUE EXPLORING</Link><span>ACCOUNT / ORDER</span></div>
    {loading ? <div className="order-detail__state"><span className="studio-loader" /><p>Loading your verified order</p></div> : null}
    {!loading && error ? <section className="order-detail__state"><p className="eyebrow">Order / Verification required</p><h1>Details are<br /><em>not available.</em></h1><p>{error}</p><button className="button button--outline" type="button" onClick={loadOrder}><RotateCcw size={14} aria-hidden="true" /> Try again</button><Link href="/discover">Return to the collection <ArrowRight size={14} aria-hidden="true" /></Link></section> : null}
    {!loading && !error && order ? <>
      <header className="order-detail__heading"><p className="eyebrow">Order / {order.orderNumber}</p><h1>A form,<br /><em>in motion.</em></h1><p>Placed {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} / {order.fulfillmentStatus.replaceAll("_", " ")}.</p></header>
      <div className="order-detail__layout">
        <section className="order-detail__items"><header><div><p className="eyebrow">Your selection / {order.items.reduce((sum, item) => sum + item.quantity, 0)} forms</p><h2>Order <em>contents.</em></h2></div><span>{formatPrice(order.totalCents, order.currency)}</span></header>
          {order.items.map((item) => <article key={item.variantId}><div className="order-detail__image">{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="82px" /> : <span>V</span>}</div><div><Link href={`/product/${item.slug}`}>{item.name}</Link><p>{item.configuration?.summary ?? "Signature configuration"}</p><small>Quantity {item.quantity}</small></div><strong>{formatPrice(item.unitAmountCents * item.quantity, item.currency)}</strong></article>)}
        </section>
        <aside className="order-detail__aside"><div><ShieldCheck size={15} aria-hidden="true" /><span><small>PAYMENT STATUS / {order.payment?.provider ?? "PAYMENT"}</small><strong>{order.paymentStatus}</strong></span></div><div><PackageCheck size={15} aria-hidden="true" /><span><small>DELIVERY ESTIMATE</small><strong>{order.shippingEstimate} / {order.shippingMethod}</strong></span></div>{order.payment ? <section><p className="eyebrow">PAYMENT RECORD</p><strong>{formatPrice(order.payment.amountCents, order.payment.currency)}</strong><span>Recorded {new Date(order.payment.createdAt).toLocaleDateString("en-US")}</span>{order.payment.reference ? <span>Reference · {order.payment.reference}</span> : null}</section> : null}<section><p className="eyebrow">DELIVERING TO</p><strong>{order.shippingAddress.recipient}</strong><span>{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}</span><span>{order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}</span><span>{order.shippingAddress.countryCode}</span></section><section><p className="eyebrow">SHIPMENT</p>{order.trackingNumber ? <><strong>{order.carrier ?? "Carrier"} / {order.trackingNumber}</strong>{order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track shipment <ArrowRight size={12} aria-hidden="true" /></a> : null}</> : <span>{order.shippedAt ? "Tracking is not available yet." : "Carrier tracking will appear here after dispatch."}</span>}</section></aside>
      </div>
      <section className="order-timeline" aria-labelledby="order-timeline-heading"><header><p className="eyebrow">A considered arrival / Order history</p><h2 id="order-timeline-heading">The journey,<br /><em>so far.</em></h2></header><ol>
        <TimelineItem title="Order placed" date={order.createdAt} complete />
        <TimelineItem title="Payment confirmed" date={order.paidAt} complete={order.paymentStatus === "succeeded" || order.paymentStatus === "paid"} />
        <TimelineItem title="In preparation" date={order.fulfillmentStatus === "processing" ? order.paidAt : null} complete={order.fulfillmentStatus === "processing" || order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered"} active={order.fulfillmentStatus === "processing"} />
        <TimelineItem title="Dispatched" date={order.shippedAt} complete={order.fulfillmentStatus === "shipped" || order.fulfillmentStatus === "delivered"} active={order.fulfillmentStatus === "shipped"} />
        <TimelineItem title="Delivered" date={order.deliveredAt} complete={order.fulfillmentStatus === "delivered"} active={order.fulfillmentStatus === "delivered"} />
      </ol></section>
      <p className="order-detail__disclosure">Order records use test-mode payments. Shipment and tracking details appear only after fulfillment updates are recorded.</p>
    </> : null}
  </main>;
}

function TimelineItem({ title, date, complete, active = false }: { title: string; date: string | null; complete: boolean; active?: boolean }) {
  return <li className={complete ? "is-complete" : active ? "is-active" : ""}><span className="order-timeline__dot" aria-hidden="true" /><div><strong>{title}</strong>{date ? <time dateTime={date}>{new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</time> : <small>{active ? "In progress" : "Pending"}</small>}</div></li>;
}
