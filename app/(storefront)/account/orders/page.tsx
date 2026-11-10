import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Box, CircleCheck, Clock3 } from "lucide-react";
import { CustomerShell } from "@/components/account/customer-shell";
import { getCustomerOrders } from "@/lib/account/data";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Your Orders", description: "Order history, payment status, and delivery progress.", path: "/account/orders", noIndex: true });

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export default async function AccountOrdersPage() {
  const { user, orders } = await getCustomerOrders();
  const fullName = String(user.user_metadata.full_name ?? "");
  return <CustomerShell user={{ fullName, email: user.email ?? "" }}>
    <section className="account-page-heading"><p className="eyebrow">Customer archive / Orders</p><h2>What you<br /><em>set in motion.</em></h2><p>Every order, with its payment record and delivery progress.</p></section>
    <section className="account-orders" aria-label="Order history">
      {orders.length ? orders.map((order) => <Link className="account-order-card" href={`/account/orders/${order.id}`} key={order.id}>
        <span className="account-order-card__index">{new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
        <span className="account-order-card__number"><small>ORDER NUMBER</small><strong>{order.order_number}</strong></span>
        <span className="account-order-card__payment"><small>PAYMENT</small><b className={order.payment_status === "paid" ? "is-paid" : ""}>{order.payment_status === "paid" ? <CircleCheck size={13} aria-hidden="true" /> : <Clock3 size={13} aria-hidden="true" />}{order.payment_status}</b></span>
        <span className="account-order-card__fulfillment"><small>FULFILLMENT</small><b>{order.fulfillment_status.replaceAll("_", " ")}</b><em>{order.shipping_estimate || "Awaiting estimate"}</em></span>
        <strong className="account-order-card__total">{money(order.total_cents, order.currency)}</strong><ArrowRight className="account-order-card__arrow" size={15} aria-hidden="true" />
      </Link>) : <div className="account-orders__empty"><span><Box size={18} aria-hidden="true" /></span><p className="eyebrow">A clear beginning</p><h3>Your order history<br /><em>starts when you do.</em></h3><p>Once an order is placed, its payment and delivery milestones will appear here.</p><Link className="button button--outline" href="/discover">Explore the collection <ArrowRight size={14} aria-hidden="true" /></Link></div>}
    </section>
  </CustomerShell>;
}
