import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Box, Heart, Sparkles } from "lucide-react";
import { CustomerShell } from "@/components/account/customer-shell";
import { getCustomerDashboardData } from "@/lib/account/data";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({ title: "Your Account", description: "Your VANTA orders, saved products, and configurations.", path: "/account", noIndex: true });

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export default async function AccountPage() {
  const data = await getCustomerDashboardData();
  const firstName = data.profile.fullName.trim().split(/\s+/)[0] || data.user.email?.split("@")[0] || "there";
  const activeDeliveries = data.orders.filter((order) => ["processing", "shipped"].includes(order.fulfillment_status)).length;

  return <CustomerShell user={{ fullName: data.profile.fullName, email: data.user.email ?? "" }}>
    <div className="account-dashboard">
      <section className="account-dashboard__signal"><p className="eyebrow">The personal archive / 0{data.orders.length} orders</p><h2>Everything you<br /><em>return to, {firstName}.</em></h2><p>Your orders, saved forms, and studio configurations remain connected to this account.</p></section>
      <div className="account-metrics"><article><span>ORDERS PLACED</span><strong>{String(data.orders.length).padStart(2, "0")}</strong><Link href="/account/orders">View order history <ArrowRight size={12} aria-hidden="true" /></Link></article><article><span>ACTIVE DELIVERIES</span><strong>{String(activeDeliveries).padStart(2, "0")}</strong><Link href="/account/orders">Track an order <ArrowRight size={12} aria-hidden="true" /></Link></article><article><span>WISHLISTED FORMS</span><strong>{String(data.wishlist.length).padStart(2, "0")}</strong><Link href="/account/wishlist">Open wishlist <ArrowRight size={12} aria-hidden="true" /></Link></article></div>

      <section className="account-section" aria-labelledby="recent-orders-heading"><header><div><p className="eyebrow">Recent movements / Your orders</p><h2 id="recent-orders-heading">The latest <em>arrivals.</em></h2></div><Link href="/account/orders">All orders <ArrowRight size={13} aria-hidden="true" /></Link></header>
        {data.orders.length ? <div className="account-order-list">{data.orders.slice(0, 3).map((order) => <Link className="account-order-row" href={`/account/orders/${order.id}`} key={order.id}><span className="account-order-row__index">{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span><span><strong>{order.order_number}</strong><small>{order.fulfillment_status.replaceAll("_", " ")} / payment {order.payment_status}</small></span><b>{money(order.total_cents, order.currency)}</b><ArrowRight size={14} aria-hidden="true" /></Link>)}</div> : <div className="account-empty-inline"><Box size={17} aria-hidden="true" /><span><strong>Your first order will find its place here.</strong><small>When you are ready, return to the collection.</small></span><Link href="/discover">Explore <ArrowRight size={12} /></Link></div>}
      </section>

      <section className="account-section" aria-labelledby="wishlist-preview-heading"><header><div><p className="eyebrow">Kept in mind / Wishlist</p><h2 id="wishlist-preview-heading">A few things <em>you saved.</em></h2></div><Link href="/account/wishlist">Full wishlist <ArrowRight size={13} aria-hidden="true" /></Link></header>
        {data.wishlist.length ? <div className="account-mini-grid">{data.wishlist.slice(0, 3).map((product) => <Link href={`/product/${product.slug}`} className="account-mini-card" key={product.id}><div>{product.images[0] ? <Image src={product.images[0]} alt="" fill sizes="(max-width: 700px) 40vw, 180px" /> : <span>V</span>}</div><span>{product.categoryName} / {money(product.salePriceCents ?? product.priceCents, product.currency)}</span><strong>{product.name}</strong></Link>)}</div> : <div className="account-empty-inline"><Heart size={17} aria-hidden="true" /><span><strong>Your wishlist is yours to compose.</strong><small>Save a form to revisit it here.</small></span><Link href="/discover">Discover <ArrowRight size={12} /></Link></div>}
      </section>

      <section className="account-section account-section--configurations" aria-labelledby="saved-configuration-heading"><header><div><p className="eyebrow">Made by you / Studio configurations</p><h2 id="saved-configuration-heading">Your own <em>edition.</em></h2></div><Link href="/discover">Open the studio <ArrowRight size={13} aria-hidden="true" /></Link></header>
        {data.configurations.length ? <div className="account-config-grid">{data.configurations.slice(0, 3).map(({ product, configuration, updatedAt }) => <Link href={`/product/${product.slug}/studio`} key={product.slug}><Sparkles size={15} aria-hidden="true" /><span><small>{new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} / {product.categoryName}</small><strong>{product.name}</strong><em>{configuration.summary ?? "Saved studio configuration"}</em></span><ArrowRight size={13} aria-hidden="true" /></Link>)}</div> : <div className="account-empty-inline"><Sparkles size={17} aria-hidden="true" /><span><strong>Start with a form. Make it yours.</strong><small>Your saved studio work will live here.</small></span><Link href="/discover">Find your form <ArrowRight size={12} /></Link></div>}
      </section>
    </div>
  </CustomerShell>;
}
